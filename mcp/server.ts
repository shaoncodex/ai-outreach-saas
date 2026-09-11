import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "leadpilot-ai", version: "0.1.0" });
const base = process.env.APP_URL || "http://localhost:3000";
const headers = { "content-type": "application/json", "x-api-key": process.env.AGENT_API_KEY || "" };

server.tool("plan_outreach", "Create a safe execution plan from a natural-language sales research/outreach command.", { command: z.string() }, async ({ command }) => {
  const r = await fetch(`${base}/api/agent/command`, { method:"POST", headers, body:JSON.stringify({ command }) });
  return { content: [{ type:"text", text: JSON.stringify(await r.json()) }] };
});

server.tool("send_email", "Send an approved email through the connected Hostinger mailbox. Policy checks run server-side.", { to:z.string().email(), subject:z.string(), text:z.string() }, async (input) => {
  const r = await fetch(`${base}/api/mail/send`, { method:"POST", headers, body:JSON.stringify(input) });
  return { content: [{ type:"text", text: JSON.stringify(await r.json()) }] };
});

server.tool("list_leads", "List current leads visible to the workspace.", {}, async () => {
  const r = await fetch(`${base}/api/leads`);
  return { content: [{ type:"text", text: JSON.stringify(await r.json()) }] };
});

await server.connect(new StdioServerTransport());
