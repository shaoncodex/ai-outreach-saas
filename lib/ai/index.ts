import OpenAI from "openai";
import { getSetting } from "@/lib/settings";

export type ReplyAnalysis = { intent: string; confidence: number; summary: string; hot: boolean };

async function openAIConfig() {
  return { apiKey: await getSetting("OPENAI_API_KEY"), model: await getSetting("OPENAI_MODEL", "gpt-5.6") || "gpt-5.6" };
}

export async function analyzeReply(text: string): Promise<ReplyAnalysis> {
  const { apiKey, model } = await openAIConfig();
  if (!apiKey) {
    const lower = text.toLowerCase();
    const hot = /price|cost|how much|interested|portfolio|sample|meeting|call/.test(lower);
    return { intent: hot ? "INTERESTED" : "OTHER", confidence: hot ? 0.83 : 0.55, summary: text.slice(0, 160), hot };
  }
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: `Classify this sales outreach reply. Return JSON with intent, confidence 0-1, summary, hot boolean. Allowed intents: INTERESTED, NOT_INTERESTED, QUESTION, PRICING_REQUEST, MEETING_REQUEST, REFERRAL, OUT_OF_OFFICE, UNSUBSCRIBE, BOUNCE, OTHER. Reply: ${text}`
  });
  try { return JSON.parse(response.output_text) as ReplyAnalysis; }
  catch { return { intent: "OTHER", confidence: 0.5, summary: response.output_text.slice(0, 160), hot: false }; }
}

export async function executeAgentCommand(command: string) {
  const { apiKey, model } = await openAIConfig();
  if (!apiKey) return { mode: "demo", summary: `Command accepted: ${command}`, suggestedTools: ["discover_leads", "research_lead", "create_campaign"] };
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: `You are the planning brain for a compliant B2B research and outreach CRM. Convert this operator command into a concise safe execution plan. Never recommend bypassing access controls, collecting sensitive/private data, or sending to suppressed/unsubscribed contacts. Command: ${command}`
  });
  return { mode: "openai", summary: response.output_text };
}
