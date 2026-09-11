import { NextResponse } from "next/server";
const demo = [
  { id:"1", name:"Sarah Johnson", company:"eXp Realty", email:"sarah@example.com", location:"Miami, FL", score:92, status:"INTERESTED" },
  { id:"2", name:"Michael Chen", company:"Real Broker", email:"michael@example.com", location:"Austin, TX", score:87, status:"CONTACTED" },
  { id:"3", name:"Emily Parker", company:"Compass", email:"emily@example.com", location:"Tampa, FL", score:84, status:"REPLIED" }
];
export async function GET() { return NextResponse.json({ data: demo }); }
