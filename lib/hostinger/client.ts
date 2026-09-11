import { Configuration, SendApi, V1SendRequest } from "@hostinger/mail-sdk";
import { getSetting } from "@/lib/settings";

async function config() {
  const token = await getSetting("HOSTINGER_MAIL_TOKEN");
  if (!token) throw new Error("HOSTINGER_MAIL_TOKEN is not configured");
  return new Configuration({ accessToken: token });
}

export type SendMailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: { uid: number; folder: string };
};

export async function sendHostingerMail(input: SendMailInput) {
  const mailboxResourceId = await getSetting("HOSTINGER_MAILBOX_RESOURCE_ID");
  if (!mailboxResourceId) throw new Error("HOSTINGER_MAILBOX_RESOURCE_ID is not configured");

  const api = new SendApi(await config());
  const payload: V1SendRequest = {
    to: [input.to], subject: input.subject, text: input.text, html: input.html,
    ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {})
  } as V1SendRequest;

  const response = await api.sendEmail(mailboxResourceId, payload);
  return { ok: response.status === 204, status: response.status };
}
