import { NextResponse } from "next/server";
import { z } from "zod";
import { processOutreachBatch } from "@/lib/outreach/engine";

const Body = z.object({ campaignId: z.string(), limit: z.number().int().min(1).max(10).default(3) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await processOutreachBatch({ campaignId: parsed.data.campaignId, limit: parsed.data.limit, forceWindow: true, previewOnly: true }));
}
