// API routes are disabled in static-export mode (used for R2 deployment).
// To re-enable, remove this file and use a server runtime (Node.js, Vercel, Cloudflare Workers, etc.)
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ message: "static build" });
}
