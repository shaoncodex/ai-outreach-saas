import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettingsStatus, writeLocalSettings } from "@/lib/settings";

const Body = z.object({ values: z.object({
  HOSTINGER_MAIL_TOKEN: z.string().optional(),
  HOSTINGER_MAILBOX_RESOURCE_ID: z.string().optional(),
  HOSTINGER_FROM_ADDRESS: z.string().optional(),
  HOSTINGER_WEBHOOK_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  AGENT_API_KEY: z.string().optional(),
  OUTREACH_CRON_SECRET: z.string().optional()
}) });

export async function GET() {
  return NextResponse.json({ settings: await getSettingsStatus() });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await writeLocalSettings(parsed.data.values);
  return NextResponse.json({ ok: true, settings: await getSettingsStatus() });
}
