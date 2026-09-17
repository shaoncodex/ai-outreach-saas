import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function GET() {
  const workspace = await getDefaultWorkspace();
  const [leads, contacted, replies, interested, activeCampaigns, suppressed, queued] = await Promise.all([
    db.lead.count({ where: { workspaceId: workspace.id } }), db.lead.count({ where: { workspaceId: workspace.id, status: "CONTACTED" } }),
    db.lead.count({ where: { workspaceId: workspace.id, status: "REPLIED" } }), db.lead.count({ where: { workspaceId: workspace.id, status: "INTERESTED" } }),
    db.campaign.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } }), db.suppression.count({ where: { workspaceId: workspace.id } }),
    db.campaignLead.count({ where: { campaign: { workspaceId: workspace.id, status: "ACTIVE" }, stopped: false } })
  ]);
  return NextResponse.json({ leads, contacted, replies, interested, activeCampaigns, suppressed, queued });
}
