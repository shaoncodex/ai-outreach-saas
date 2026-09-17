import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

const Body = z.object({ campaignId: z.string(), leadIds: z.array(z.string()).optional(), allEligible: z.boolean().optional() }).refine(value => value.allEligible || value.leadIds?.length, "Select leads to enroll");

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const workspace = await getDefaultWorkspace();
  const campaign = await db.campaign.findFirst({ where: { id: parsed.data.campaignId, workspaceId: workspace.id } });
  if (!campaign) return NextResponse.json({ error: "campaign_not_found" }, { status: 404 });
  const leads = await db.lead.findMany({ where: { workspaceId: workspace.id, outreachAllowed: true, status: { notIn: ["UNSUBSCRIBED", "BOUNCED"] }, ...(parsed.data.allEligible ? {} : { id: { in: parsed.data.leadIds } }) }, select: { id: true } });
  const created = await db.campaignLead.createMany({ skipDuplicates: true, data: leads.map(lead => ({ campaignId: campaign.id, leadId: lead.id, nextActionAt: new Date() })) });
  return NextResponse.json({ ok: true, enrolled: created.count, eligible: leads.length });
}
