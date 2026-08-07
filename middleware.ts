import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimitStub } from "@/lib/rate-limit";

/**
 * Session refresh + role gates + login rate-limit hook.
 */
export async function middleware(request: NextRequest) {
  const rate = checkRateLimitStub(request);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfterSeconds: rate.retryAfterSeconds ?? 60,
      },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
