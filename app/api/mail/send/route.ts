import { NextResponse } from "next/server";
import { z } from "zod";
import { canSendOutreach } from "@/lib/policy/outreach";
import { sendHostingerMail } from "@/lib/hostinger/client";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { ensureDefaultMailbox, getDefaultWorkspace } from "@/lib/workspace";

const Body = z.object({ to: z.string().email(), subject: z.string().min(1), text: z.string().optional(), html: z.string().optional(), inReplyTo: z.object({ uid: z.number().int().positive(), folder: z.string().min(1) }).optional() });
export async function POST(req: Request) {
  const key = req.headers.get("x-api-key");
  const expected = await getSetting("AGENT_API_KEY");
  if (!expected) return NextResponse.json({ error: "agent_api_key_not_configured" }, { status: 503 });
  if (key !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const workspace = await getDefaultWorkspace();
  const [lead, suppression, mailbox] = await Promise.all([
    db.lead.findUnique({ where: { workspaceId_email: { workspaceId: workspace.id, email: parsed.data.to.toLowerCase() } } }),
    db.suppression.findUnique({ where: { workspaceId_email: { workspaceId: workspace.id, email: parsed.data.to.toLowerCase() } } }),
    ensureDefaultMailbox(workspace.id)
  ]);
  if (!lead) return NextResponse.json({ error: "contact_not_found_or_not_approved" }, { status: 409 });
  const reply = await db.emailMessage.findFirst({ where: { leadId: lead.id, direction: "INBOUND" } });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentToday = mailbox ? await db.emailMessage.count({ where: { fromAddress: mailbox.address, direction: "OUTBOUND", status: "SENT", sentAt: { gte: since } } }) : 0;
  const policy = canSendOutreach({ email: parsed.data.to, outreachAllowed: lead.outreachAllowed, suppressed: Boolean(suppression), replied: Boolean(reply), sentToday, dailyLimit: mailbox?.dailyLimit || 10 });
  if (!policy.allowed) return NextResponse.json({ error: "policy_blocked", reasons: policy.reasons }, { status: 409 });
  const result = await sendHostingerMail(parsed.data);
  if (result.ok) await db.emailMessage.create({ data: { leadId: lead.id, direction: "OUTBOUND", status: "SENT", fromAddress: mailbox?.address || "hello@shaonrahman.com", toAddress: lead.email, subject: parsed.data.subject, textBody: parsed.data.text, htmlBody: parsed.data.html, sentAt: new Date() } });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
