import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ ok: true, service: "leadpilot-ai", integrations: {
    hostinger: Boolean(process.env.HOSTINGER_MAIL_TOKEN && process.env.HOSTINGER_MAILBOX_RESOURCE_ID),
    openai: Boolean(process.env.OPENAI_API_KEY),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    redis: Boolean(process.env.REDIS_URL)
  }});
}
