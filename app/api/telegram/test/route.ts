import { NextResponse } from "next/server";
import { notifyTelegram } from "@/lib/telegram";

export async function POST() {
  try {
    const result = await notifyTelegram("✅ <b>LeadPilot AI connected</b>\nTelegram reply notifications are working.");
    if ((result as { skipped?: boolean }).skipped) return NextResponse.json({ error: "telegram_not_configured" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
