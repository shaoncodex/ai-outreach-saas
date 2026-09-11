import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ data: [
  { id:"c1", name:"US Realtors — Signature Design", status:"ACTIVE", leads:326, replies:84, positive:29, won:4 },
  { id:"c2", name:"Texas Brokerages", status:"PAUSED", leads:118, replies:22, positive:9, won:2 }
]}); }
