import "./globals.css";
import "./outreach.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "LeadPilot AI", description: "AI-assisted B2B research, outreach and inbox intelligence" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
