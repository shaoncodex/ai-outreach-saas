import { NextResponse } from "next/server";
import { z } from "zod";
import { executeAgentCommand } from "@/lib/ai";
import { getSetting } from "@/lib/settings";
const Body = z.object({ command: z.string().min(4) });
export async function POST(req: Request) {
  const key = req.headers.get("x-api-key");
  const expected = await getSetting("AGENT_API_KEY");
  if (expected && key !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  return NextResponse.json(await executeAgentCommand(body.data.command));
}
