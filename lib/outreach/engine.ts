import { CampaignStatus, LeadStatus, MessageDirection, MessageStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { sendHostingerMail } from "@/lib/hostinger/client";
import { canSendOutreach } from "@/lib/policy/outreach";
import { htmlToText, renderTemplate } from "@/lib/outreach/templates";

type RunOptions = { campaignId?: string; limit?: number; forceWindow?: boolean; previewOnly?: boolean };

function localHourAndDay(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(new Date());
  return { hour: Number(parts.find(part => part.type === "hour")?.value || 0), weekday: parts.find(part => part.type === "weekday")?.value || "Mon" };
}

function isInsideSendWindow(campaign: { timezone: string; sendWindowStart: number; sendWindowEnd: number; weekdaysOnly: boolean }) {
  const local = localHourAndDay(campaign.timezone);
  if (campaign.weekdaysOnly && ["Sat", "Sun"].includes(local.weekday)) return false;
  return local.hour >= campaign.sendWindowStart && local.hour < campaign.sendWindowEnd;
}

const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

function optOutFooter(text: string) {
  if (/unsubscribe|opt[ -]?out/i.test(text)) return text;
  return `${text.trim()}\n\nIf you do not want to receive further emails, reply with “unsubscribe”.`;
}

export async function processOutreachBatch(options: RunOptions = {}) {
  const campaigns = await db.campaign.findMany({
    where: { status: CampaignStatus.ACTIVE, ...(options.campaignId ? { id: options.campaignId } : {}) },
    include: { mailbox: true, steps: { orderBy: { step: "asc" } } }
  });
  const report: Array<Record<string, unknown>> = [];

  for (const campaign of campaigns) {
    const previewOnly = options.previewOnly ?? campaign.dryRun;
    if (!campaign.mailbox) {
      report.push({ campaignId: campaign.id, campaign: campaign.name, skipped: "mailbox_not_configured" });
      continue;
    }
    if (!options.forceWindow && !isInsideSendWindow(campaign)) {
      report.push({ campaignId: campaign.id, campaign: campaign.name, skipped: "outside_send_window" });
      continue;
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sentToday, mailboxSentToday] = await Promise.all([
      db.emailMessage.count({ where: { campaignId: campaign.id, direction: MessageDirection.OUTBOUND, status: MessageStatus.SENT, sentAt: { gte: since } } }),
      db.emailMessage.count({ where: { fromAddress: campaign.mailbox.address, direction: MessageDirection.OUTBOUND, status: MessageStatus.SENT, sentAt: { gte: since } } })
    ]);
    const remaining = Math.max(0, Math.min(campaign.dailyLimit - sentToday, campaign.mailbox.dailyLimit - mailboxSentToday));
    const take = Math.min(options.limit ?? 1, remaining);
    if (!take) {
      report.push({ campaignId: campaign.id, campaign: campaign.name, skipped: "daily_limit_reached", sentToday });
      continue;
    }

    const due = await db.campaignLead.findMany({
      where: { campaignId: campaign.id, stopped: false, OR: [{ nextActionAt: null }, { nextActionAt: { lte: new Date() } }] },
      include: { lead: true }, orderBy: [{ nextActionAt: "asc" }, { id: "asc" }], take
    });
    const campaignReport = { campaignId: campaign.id, campaign: campaign.name, dryRun: previewOnly, attempted: due.length, sent: 0, blocked: 0, failed: 0, previews: [] as unknown[] };

    for (const enrollment of due) {
      const lead = enrollment.lead;
      const step = campaign.steps.find(item => item.step === enrollment.currentStep);
      if (!step) {
        if (!previewOnly) await db.campaignLead.update({ where: { id: enrollment.id }, data: { stopped: true, stopReason: "sequence_complete", nextActionAt: null } });
        continue;
      }
      const [suppression, reply] = await Promise.all([
        db.suppression.findUnique({ where: { workspaceId_email: { workspaceId: campaign.workspaceId, email: lead.email } } }),
        db.emailMessage.findFirst({ where: { leadId: lead.id, direction: MessageDirection.INBOUND } })
      ]);
      const policy = canSendOutreach({ email: lead.email, suppressed: Boolean(suppression), replied: Boolean(reply), campaignActive: true, sentToday: sentToday + campaignReport.sent, dailyLimit: campaign.dailyLimit, outreachAllowed: lead.outreachAllowed });
      if (!policy.allowed) {
        campaignReport.blocked++;
        if (!previewOnly && (suppression || reply || !lead.outreachAllowed)) await db.campaignLead.update({ where: { id: enrollment.id }, data: { stopped: true, stopReason: policy.reasons.join(","), nextActionAt: null } });
        continue;
      }
      const subject = renderTemplate(step.subjectTemplate || `A quick idea for {{company}}`, lead);
      const rawText = step.textTemplate || step.instruction;
      const text = optOutFooter(renderTemplate(rawText, lead));
      const html = step.htmlTemplate ? `${renderTemplate(step.htmlTemplate, lead)}<p style="margin-top:18px;font-size:11px;color:#777">If you do not want to receive further emails, reply with “unsubscribe”.</p>` : undefined;
      if (previewOnly) {
        campaignReport.previews.push({ leadId: lead.id, to: lead.email, step: step.step, subject, text: text.slice(0, 400) });
        continue;
      }
      try {
        const response = await sendHostingerMail({ to: lead.email, subject, text: html ? htmlToText(html) || text : text, html });
        if (!response.ok) throw new Error(`Hostinger returned ${response.status}`);
        await db.$transaction([
          db.emailMessage.create({ data: { leadId: lead.id, campaignId: campaign.id, direction: MessageDirection.OUTBOUND, status: MessageStatus.SENT, fromAddress: campaign.mailbox.address, toAddress: lead.email, subject, textBody: text, htmlBody: html, sentAt: new Date(), sequenceStep: step.step } }),
          db.lead.update({ where: { id: lead.id }, data: { status: LeadStatus.CONTACTED } }),
          db.campaignLead.update({ where: { id: enrollment.id }, data: (() => { const next = campaign.steps.find(item => item.step === step.step + 1); return next ? { currentStep: next.step, nextActionAt: addHours(new Date(), next.delayHours) } : { currentStep: step.step + 1, nextActionAt: null, stopped: true, stopReason: "sequence_complete" }; })() })
        ]);
        campaignReport.sent++;
      } catch (error) {
        campaignReport.failed++;
        await db.emailMessage.create({ data: { leadId: lead.id, campaignId: campaign.id, direction: MessageDirection.OUTBOUND, status: MessageStatus.FAILED, fromAddress: campaign.mailbox.address, toAddress: lead.email, subject, textBody: text, htmlBody: html, sequenceStep: step.step, errorMessage: error instanceof Error ? error.message : String(error) } });
      }
    }
    report.push(campaignReport);
  }
  return { processedAt: new Date().toISOString(), campaigns: report };
}
