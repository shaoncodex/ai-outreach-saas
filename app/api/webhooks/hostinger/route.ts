import crypto from "crypto";
import { Intent, LeadStatus, MessageDirection, MessageStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { analyzeReply } from "@/lib/ai";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { notifyTelegram } from "@/lib/telegram";
import { getDefaultWorkspace } from "@/lib/workspace";

const cleanAddress = (value: unknown): string => {
  if (typeof value === "string") return (value.match(/<([^>]+@[^>]+)>/)?.[1] || value).trim().toLowerCase();
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return cleanAddress(item.email || item.address || item.mailbox);
  }
  return "";
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));

export async function POST(req: Request) {
  const expected = await getSetting("HOSTINGER_WEBHOOK_SECRET");
  if (!expected) return NextResponse.json({ error: "webhook_secret_not_configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "invalid_webhook_secret" }, { status: 401 });
  const raw = await req.text();
  let event: Record<string, any>;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const workspace = await getDefaultWorkspace();
  const providerEventId = String(event.id || event.eventId || req.headers.get("x-event-id") || crypto.createHash("sha256").update(raw).digest("hex"));
  if (await db.webhookEvent.findUnique({ where: { providerEventId } })) return NextResponse.json({ received: true, duplicate: true });
  const payload = event.data || event.message || event;
  const from = cleanAddress(payload.from || payload.sender);
  const to = cleanAddress(Array.isArray(payload.to) ? payload.to[0] : payload.to || payload.recipient) || (await getSetting("HOSTINGER_FROM_ADDRESS", "hello@shaonrahman.com")) || "hello@shaonrahman.com";
  const subject = String(payload.subject || "(No subject)");
  const text = String(payload.text || payload.body || payload.textBody || payload.snippet || "");
  const messageId = String(payload.messageId || payload.message_id || providerEventId);
  const analysis = await analyzeReply(text || subject);
  const allowedIntents = new Set(Object.values(Intent));
  if (!allowedIntents.has(analysis.intent as Intent)) analysis.intent = "OTHER";
  const lead = from ? await db.lead.findUnique({ where: { workspaceId_email: { workspaceId: workspace.id, email: from } } }) : null;
  const enrollment = lead ? await db.campaignLead.findFirst({ where: { leadId: lead.id }, orderBy: { id: "desc" }, include: { campaign: true } }) : null;
  await db.$transaction(async tx => {
    await tx.webhookEvent.create({ data: { workspaceId: workspace.id, providerEventId, eventType: String(event.type || event.event || "message.received"), payload: event as Prisma.InputJsonValue } });
    await tx.emailMessage.create({ data: { leadId: lead?.id, campaignId: enrollment?.campaignId, direction: MessageDirection.INBOUND, status: MessageStatus.RECEIVED, providerMessageId: messageId, fromAddress: from || "unknown", toAddress: to, subject, textBody: text, receivedAt: new Date(), intent: analysis.intent as Intent, intentConfidence: analysis.confidence } });
    if (lead) {
      const unsubscribed = analysis.intent === "UNSUBSCRIBE";
      const bounced = analysis.intent === "BOUNCE";
      const interested = ["INTERESTED", "PRICING_REQUEST", "MEETING_REQUEST"].includes(analysis.intent);
      await tx.lead.update({ where: { id: lead.id }, data: { status: unsubscribed ? LeadStatus.UNSUBSCRIBED : bounced ? LeadStatus.BOUNCED : interested ? LeadStatus.INTERESTED : LeadStatus.REPLIED, ...(unsubscribed ? { unsubscribedAt: new Date(), outreachAllowed: false } : {}) } });
      await tx.campaignLead.updateMany({ where: { leadId: lead.id, stopped: false }, data: { stopped: true, stopReason: unsubscribed ? "unsubscribed" : bounced ? "bounced" : "reply_received", nextActionAt: null } });
      if (unsubscribed || bounced) await tx.suppression.upsert({ where: { workspaceId_email: { workspaceId: workspace.id, email: lead.email } }, update: { reason: unsubscribed ? "unsubscribe" : "bounce" }, create: { workspaceId: workspace.id, email: lead.email, reason: unsubscribed ? "unsubscribe" : "bounce" } });
    }
  });
  const icon = analysis.hot ? "🔥" : analysis.intent === "UNSUBSCRIBE" ? "🚫" : analysis.intent === "BOUNCE" ? "⚠️" : "📩";
  let telegramNotified = true;
  try { await notifyTelegram(`${icon} <b>New outreach reply</b>\nFrom: ${escapeHtml(from || "Unknown sender")}\nSubject: ${escapeHtml(subject)}\nIntent: ${escapeHtml(analysis.intent)}\nConfidence: ${Math.round(analysis.confidence * 100)}%${enrollment ? `\nCampaign: ${escapeHtml(enrollment.campaign.name)}` : ""}\n\n${escapeHtml((analysis.summary || text).slice(0, 700))}`); }
  catch { telegramNotified = false; }
  return NextResponse.json({ received: true, leadMatched: Boolean(lead), followupsStopped: Boolean(lead), telegramNotified, analysis });
}
