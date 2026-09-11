import { getSetting } from "@/lib/settings";

export async function notifyTelegram(message: string) {
  const token = await getSetting("TELEGRAM_BOT_TOKEN");
  const chatId = await getSetting("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return { skipped: true };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" })
  });
  if (!res.ok) throw new Error(`Telegram failed: ${res.status}`);
  return res.json();
}
