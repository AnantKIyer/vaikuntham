import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vaikuntham",
    phase: "foundation",
    timestamp: new Date().toISOString(),
  });
}
