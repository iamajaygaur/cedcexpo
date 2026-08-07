import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { SESSION_MODE_COOKIE } from "@/lib/auth/session-mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils/request-origin";

/**
 * Browser-friendly sign-out (form POST or fetch).
 * Always ends on /login — failures during signOut must not surface as
 * the app error page (common race after judge sessions on Vercel).
 */
async function clearSession() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Session may already be gone or cookies half-cleared.
    }
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_MODE_COOKIE, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    // Best-effort wipe of any leftover Supabase auth cookies.
    for (const c of cookieStore.getAll()) {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
      ) {
        cookieStore.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    }
  } catch {
    // Cookie jar might be read-only in rare edge cases.
  }
}

function loginRedirect(request: NextRequest) {
  const switchAccount = request.nextUrl.searchParams.get("switch") === "1";
  const loginPath = switchAccount ? "/login?switch=1" : "/login";
  return NextResponse.redirect(absoluteUrl(request, loginPath), 303);
}

export async function POST(request: NextRequest) {
  await clearSession();
  return loginRedirect(request);
}

export async function GET(request: NextRequest) {
  await clearSession();
  return loginRedirect(request);
}
