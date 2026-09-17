import { NextResponse } from "next/server";
import { processOutreachBatch } from "@/lib/outreach/engine";
import { getSetting } from "@/lib/settings";

export async function POST(req: Request) {
  const expected = await getSetting("OUTREACH_CRON_SECRET");
  if (!expected) return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 503 });
  const supplied = req.headers.get("authorization");
  if (supplied !== `Bearer ${expected}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(await processOutreachBatch({ campaignId: body.campaignId, limit: body.limit, forceWindow: Boolean(body.forceWindow), previewOnly: body.previewOnly }));
}
