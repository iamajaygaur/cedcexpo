import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  SESSION_MODE_COOKIE,
  applySessionCookieOptions,
  isEphemeralSessionMode,
  type SessionMode,
} from "@/lib/auth/session-mode";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { absoluteUrl } from "@/lib/utils/request-origin";

function sessionModeFromRequest(request: NextRequest): SessionMode {
  const raw = request.cookies.get(SESSION_MODE_COOKIE)?.value;
  return isEphemeralSessionMode(raw) ? "ephemeral" : "persistent";
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/reset-password";
  }
  return raw;
}

/**
 * PKCE code exchange for recovery (and other) email links.
 * Redirects to `next` (default /reset-password) after cookies are set.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return NextResponse.redirect(
      absoluteUrl(request, "/login?error=auth_not_configured"),
    );
  }

  const sessionMode = sessionModeFromRequest(request);
  let response = NextResponse.redirect(absoluteUrl(request, next));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(
            name,
            value,
            applySessionCookieOptions(options, sessionMode),
          );
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        absoluteUrl(
          request,
          `/forgot-password?error=${encodeURIComponent("Reset link expired or invalid. Request a new one.")}`,
        ),
      );
    }
    return response;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery",
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        absoluteUrl(
          request,
          `/forgot-password?error=${encodeURIComponent("Reset link expired or invalid. Request a new one.")}`,
        ),
      );
    }
    return response;
  }

  return NextResponse.redirect(
    absoluteUrl(
      request,
      `/forgot-password?error=${encodeURIComponent("Missing reset token. Request a new link.")}`,
    ),
  );
}
