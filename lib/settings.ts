import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type AppSettingKey =
  | "HOSTINGER_MAIL_TOKEN"
  | "HOSTINGER_MAILBOX_RESOURCE_ID"
  | "HOSTINGER_WEBHOOK_SECRET"
  | "OPENAI_API_KEY"
  | "OPENAI_MODEL"
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_CHAT_ID"
  | "AGENT_API_KEY";

export type AppSettings = Partial<Record<AppSettingKey, string>>;

const DATA_DIR = path.join(process.cwd(), "data");
const KEY_FILE = path.join(DATA_DIR, ".settings-key");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.enc.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function getLocalKey() {
  await ensureDir();
  try {
    const value = (await fs.readFile(KEY_FILE, "utf8")).trim();
    if (value) return Buffer.from(value, "base64");
  } catch {}
  const key = crypto.randomBytes(32);
  await fs.writeFile(KEY_FILE, key.toString("base64"), { mode: 0o600 });
  return key;
}

async function encryptJson(value: AppSettings) {
  const key = await getLocalKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 1, iv: iv.toString("base64"), tag: tag.toString("base64"), data: encrypted.toString("base64") };
}

async function decryptJson(payload: { iv: string; tag: string; data: string }): Promise<AppSettings> {
  const key = await getLocalKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(plain);
}

export async function readLocalSettings(): Promise<AppSettings> {
  try {
    const raw = JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8"));
    return await decryptJson(raw);
  } catch {
    return {};
  }
}

export async function writeLocalSettings(patch: AppSettings) {
  const current = await readLocalSettings();
  const next: AppSettings = { ...current };
  for (const [key, value] of Object.entries(patch) as [AppSettingKey, string | undefined][]) {
    if (value === undefined) continue;
    const clean = value.trim();
    if (clean === "__KEEP__") continue;
    if (clean === "__CLEAR__") delete next[key];
    else next[key] = clean;
  }
  await ensureDir();
  const encrypted = await encryptJson(next);
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
  return next;
}

export async function getSetting(key: AppSettingKey, fallback?: string) {
  const local = await readLocalSettings();
  return local[key] || process.env[key] || fallback;
}

export async function getSettingsStatus() {
  const local = await readLocalSettings();
  const keys: AppSettingKey[] = [
    "HOSTINGER_MAIL_TOKEN","HOSTINGER_MAILBOX_RESOURCE_ID","HOSTINGER_WEBHOOK_SECRET",
    "OPENAI_API_KEY","OPENAI_MODEL","TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID","AGENT_API_KEY"
  ];
  return Object.fromEntries(keys.map(key => [key, {
    configured: Boolean(local[key] || process.env[key]),
    source: local[key] ? "local" : process.env[key] ? "env" : "none",
    value: key === "OPENAI_MODEL" ? (local[key] || process.env[key] || "gpt-5.6") : undefined
  }]));
}
