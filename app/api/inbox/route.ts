import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function GET() {
  const workspace = await getDefaultWorkspace();
  const data = await db.emailMessage.findMany({ where: { direction: "INBOUND", lead: { workspaceId: workspace.id } }, orderBy: { receivedAt: "desc" }, take: 100, include: { lead: { select: { fullName: true, email: true, company: true, status: true } }, campaign: { select: { name: true } } } });
  return NextResponse.json({ data });
}
