import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  SESSION_MODE_COOKIE,
  applySessionCookieOptions,
  isEphemeralSessionMode,
  type SessionMode,
} from "@/lib/auth/session-mode";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { UserRole } from "@/types/database";
import { absoluteUrl } from "@/lib/utils/request-origin";

function redirectTo(
  request: NextRequest,
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const url = absoluteUrl(request, pathname);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

function sessionModeFromRequest(request: NextRequest): SessionMode {
  const raw = request.cookies.get(SESSION_MODE_COOKIE)?.value;
  return isEphemeralSessionMode(raw) ? "ephemeral" : "persistent";
}

/**
 * Refresh session cookies and enforce role gates for /admin and /judge.
 * Role is read from profiles (server), never from client claims.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const pathname = request.nextUrl.pathname;
  const sessionMode = sessionModeFromRequest(request);

  const isAdminPath = pathname.startsWith("/admin");
  const isJudgePath = pathname.startsWith("/judge");
  const isLoginPath = pathname === "/login";
  const isProtected = isAdminPath || isJudgePath;

  if (!url || !anonKey) {
    if (isProtected) {
      return redirectTo(request, "/login", {
        error: "auth_not_configured",
      });
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            applySessionCookieOptions(options, sessionMode),
          );
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    return redirectTo(request, "/login", { next: pathname });
  }

  let role: UserRole | null = null;
  let judgeActive: boolean | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (profile?.role as UserRole | undefined) ?? null;

    if (role === "judge") {
      const { data: judge } = await supabase
        .from("judges")
        .select("active")
        .eq("profile_id", user.id)
        .maybeSingle();
      judgeActive = judge?.active === true;
    }
  }

  if (isAdminPath && role !== "admin") {
    if (role === "judge" && judgeActive) {
      return redirectTo(request, "/judge/dashboard");
    }
    return redirectTo(request, "/login");
  }

  if (isJudgePath && role === "judge" && judgeActive === false) {
    await supabase.auth.signOut();
    return redirectTo(request, "/login", { error: "inactive_judge" });
  }

  if (isJudgePath && role !== "judge" && role !== "admin") {
    return redirectTo(request, "/login");
  }

  // Allow /login?switch=1 so admins can change accounts after a judge session
  // (one browser can only hold one Supabase session at a time).
  const isSwitchingAccount =
    request.nextUrl.searchParams.get("switch") === "1";

  if (isLoginPath && user && role && !isSwitchingAccount) {
    if (role === "judge" && judgeActive === false) {
      await supabase.auth.signOut();
      return redirectTo(request, "/login", { error: "inactive_judge" });
    }
    const dest = role === "admin" ? "/admin/dashboard" : "/judge/dashboard";
    return redirectTo(request, dest);
  }

  return supabaseResponse;
}
