import { CampaignStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureDefaultMailbox, getDefaultWorkspace } from "@/lib/workspace";

const Step = z.object({ delayHours: z.number().int().min(0).max(8760), subject: z.string().min(1), text: z.string().min(1), html: z.string().optional() });
const CreateBody = z.object({ name: z.string().min(3).max(120), goal: z.string().min(3).max(500), audience: z.string().max(300).optional(), dailyLimit: z.number().int().min(1).max(100).default(10), sendWindowStart: z.number().int().min(0).max(23).default(9), sendWindowEnd: z.number().int().min(1).max(24).default(17), timezone: z.string().default("Asia/Dhaka"), weekdaysOnly: z.boolean().default(true), dryRun: z.boolean().default(true), steps: z.array(Step).min(1).max(6) });
const PatchBody = z.object({ id: z.string(), status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(), dryRun: z.boolean().optional(), dailyLimit: z.number().int().min(1).max(100).optional() });

export async function GET() {
  const workspace = await getDefaultWorkspace();
  const data = await db.campaign.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { leads: true, messages: true } }, steps: { orderBy: { step: "asc" } }, mailbox: { select: { address: true } } } });
  const enriched = await Promise.all(data.map(async campaign => ({ ...campaign, replies: await db.emailMessage.count({ where: { campaignId: campaign.id, direction: "INBOUND" } }), sent: await db.emailMessage.count({ where: { campaignId: campaign.id, direction: "OUTBOUND", status: "SENT" } }) })));
  return NextResponse.json({ data: enriched });
}

export async function POST(req: Request) {
  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.sendWindowEnd <= parsed.data.sendWindowStart) return NextResponse.json({ error: "send_window_end_must_be_after_start" }, { status: 400 });
  const workspace = await getDefaultWorkspace();
  const mailbox = await ensureDefaultMailbox(workspace.id);
  const campaign = await db.campaign.create({ data: { workspaceId: workspace.id, mailboxId: mailbox?.id, name: parsed.data.name, goal: parsed.data.goal, audience: parsed.data.audience, dailyLimit: parsed.data.dailyLimit, sendWindowStart: parsed.data.sendWindowStart, sendWindowEnd: parsed.data.sendWindowEnd, timezone: parsed.data.timezone, weekdaysOnly: parsed.data.weekdaysOnly, dryRun: parsed.data.dryRun, steps: { create: parsed.data.steps.map((step, index) => ({ step: index, delayHours: index === 0 ? 0 : step.delayHours, purpose: index === 0 ? "Initial outreach" : `Follow-up ${index}`, instruction: step.text, subjectTemplate: step.subject, textTemplate: step.text, htmlTemplate: step.html })) } }, include: { steps: true } });
  return NextResponse.json({ ok: true, data: campaign }, { status: 201 });
}

export async function PATCH(req: Request) {
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const workspace = await getDefaultWorkspace();
  const exists = await db.campaign.findFirst({ where: { id: parsed.data.id, workspaceId: workspace.id } });
  if (!exists) return NextResponse.json({ error: "campaign_not_found" }, { status: 404 });
  const data = await db.campaign.update({ where: { id: exists.id }, data: { ...(parsed.data.status ? { status: parsed.data.status as CampaignStatus } : {}), ...(parsed.data.dryRun !== undefined ? { dryRun: parsed.data.dryRun } : {}), ...(parsed.data.dailyLimit ? { dailyLimit: parsed.data.dailyLimit } : {}) } });
  return NextResponse.json({ ok: true, data });
}
