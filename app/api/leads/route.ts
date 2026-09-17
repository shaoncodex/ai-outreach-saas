import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseContactsCsv } from "@/lib/outreach/csv";
import { getDefaultWorkspace } from "@/lib/workspace";

const ImportBody = z.object({ csv: z.string().min(5), permissionConfirmed: z.literal(true), permissionSource: z.string().min(3).max(200), campaignId: z.string().optional() });

export async function GET(req: Request) {
  const workspace = await getDefaultWorkspace();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));
  const search = url.searchParams.get("search")?.trim();
  const where = { workspaceId: workspace.id, ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }, { company: { contains: search, mode: "insensitive" as const } }] } : {}) };
  const [data, total] = await Promise.all([db.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), db.lead.count({ where })]);
  return NextResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(req: Request) {
  const parsed = ImportBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const workspace = await getDefaultWorkspace();
  const contacts = parseContactsCsv(parsed.data.csv);
  let imported = 0;
  let existing = 0;
  const leadIds: string[] = [];
  for (let offset = 0; offset < contacts.valid.length; offset += 250) {
    const batch = contacts.valid.slice(offset, offset + 250);
    const emails = batch.map(item => item.email);
    existing += await db.lead.count({ where: { workspaceId: workspace.id, email: { in: emails } } });
    const created = await db.lead.createMany({ skipDuplicates: true, data: batch.map(contact => ({ ...contact, workspaceId: workspace.id, outreachAllowed: true, permissionSource: parsed.data.permissionSource })) });
    imported += created.count;
    const records = await db.lead.findMany({ where: { workspaceId: workspace.id, email: { in: emails } }, select: { id: true } });
    leadIds.push(...records.map(record => record.id));
  }
  if (parsed.data.campaignId && leadIds.length) {
    const campaign = await db.campaign.findFirst({ where: { id: parsed.data.campaignId, workspaceId: workspace.id } });
    if (!campaign) return NextResponse.json({ error: "campaign_not_found" }, { status: 404 });
    await db.campaignLead.createMany({ skipDuplicates: true, data: leadIds.map(leadId => ({ campaignId: campaign.id, leadId })) });
  }
  return NextResponse.json({ ok: true, totalRows: contacts.totalRows, imported, existing, invalid: contacts.invalid, eligible: leadIds.length });
}
