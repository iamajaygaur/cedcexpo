import { NextResponse } from "next/server";

/** Lightweight health check — no secrets, no DB. */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "cedc-design-expo",
    phase: 2,
  });
}
