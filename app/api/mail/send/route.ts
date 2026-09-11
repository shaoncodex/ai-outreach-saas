import { NextResponse } from "next/server";
import { z } from "zod";
import { canSendOutreach } from "@/lib/policy/outreach";
import { sendHostingerMail } from "@/lib/hostinger/client";

const Body = z.object({ to: z.string().email(), subject: z.string().min(1), text: z.string().optional(), html: z.string().optional(), inReplyTo: z.object({ uid: z.number().int().positive(), folder: z.string().min(1) }).optional() });
export async function POST(req: Request) {
  const key = req.headers.get("x-api-key");
  if (process.env.AGENT_API_KEY && key !== process.env.AGENT_API_KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const policy = canSendOutreach({ email: parsed.data.to });
  if (!policy.allowed) return NextResponse.json({ error: "policy_blocked", reasons: policy.reasons }, { status: 409 });
  const result = await sendHostingerMail(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
