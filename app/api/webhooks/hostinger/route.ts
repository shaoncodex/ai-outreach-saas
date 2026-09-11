import { NextResponse } from "next/server";
import { analyzeReply } from "@/lib/ai";
import { notifyTelegram } from "@/lib/telegram";
import { getSetting } from "@/lib/settings";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = await getSetting("HOSTINGER_WEBHOOK_SECRET");
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: "invalid_webhook_secret" }, { status: 401 });
  const event = await req.json();
  const text = event?.data?.text || event?.data?.body || event?.message?.text || "";
  const from = event?.data?.from?.email || event?.data?.from || event?.message?.from || "unknown sender";
  const analysis = await analyzeReply(String(text));
  if (analysis.hot) await notifyTelegram(`🔥 <b>Hot lead reply</b>\nFrom: ${from}\nIntent: ${analysis.intent}\nConfidence: ${Math.round(analysis.confidence * 100)}%\n\n${analysis.summary}`);
  return NextResponse.json({ received: true, analysis });
}
