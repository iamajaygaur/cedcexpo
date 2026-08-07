import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  SESSION_MODE_COOKIE,
  applySessionCookieOptions,
  type SessionMode,
} from "@/lib/auth/session-mode";
import { dashboardPathForRole } from "@/lib/auth/session";
import {
  authEmailFromUsername,
  normalizeDisplayName,
  parseLoginUsername,
  toLoginUsername,
} from "@/lib/auth/username";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validation/auth";
import { isAppRole } from "@/lib/permissions/roles";
import { TABLES } from "@/lib/supabase/tables";
import { absoluteUrl } from "@/lib/utils/request-origin";
import type { Database, UserRole } from "@/types/database";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
};

function clientKeyFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

function redirectToLogin(request: NextRequest, message: string) {
  const url = absoluteUrl(request, "/login");
  url.searchParams.set("error", "login_failed");
  url.searchParams.set("msg", message);
  return NextResponse.redirect(url, 303);
}

/**
 * Classic HTML form POST login with cookies written onto the redirect response.
 * Required for:
 * 1) Browser "Save password" (real form navigation, not fetch/server-action)
 * 2) Session cookies surviving the 303 redirect
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const rate = checkLoginRateLimit(clientKeyFromRequest(request));
  if (!rate.allowed) {
    return redirectToLogin(
      request,
      "Too many sign-in attempts. Please wait a minute and try again.",
    );
  }

  const rememberRaw = formData.get("remember");
  const isRemember =
    rememberRaw === "on" ||
    rememberRaw === "true" ||
    rememberRaw === "1" ||
    rememberRaw === "yes";

  const parsed = loginSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    remember: isRemember,
  });

  if (!parsed.success) {
    return redirectToLogin(
      request,
      parsed.error.issues[0]?.message ?? "Invalid credentials.",
    );
  }

  if (!isSupabaseConfigured()) {
    return redirectToLogin(
      request,
      "Authentication is not configured. Set Supabase keys in .env.local.",
    );
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return redirectToLogin(request, "Authentication is not configured.");
  }

  const rawIdentifier = parsed.data.username.trim();
  let email: string | null = null;
  let usernameSlug = "";

  if (looksLikeEmail(rawIdentifier)) {
    email = rawIdentifier.toLowerCase();
  } else {
    const nameParsed = parseLoginUsername(rawIdentifier);
    if (!nameParsed.ok) {
      return redirectToLogin(request, nameParsed.message);
    }
    usernameSlug = nameParsed.username;
    email = authEmailFromUsername(usernameSlug);

    // Prefer real profile email when available (admin client).
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: byEmail } = await admin
        .from(TABLES.profiles)
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (byEmail?.email) {
        email = byEmail.email;
      } else {
        const { data: rpcEmail, error } = await admin.rpc(
          "resolve_login_email",
          { p_username: usernameSlug },
        );
        if (!error && typeof rpcEmail === "string" && rpcEmail.length > 0) {
          email = rpcEmail;
        }
      }
    } catch {
      // Keep synthetic email fallback.
    }
  }

  const sessionMode: SessionMode = parsed.data.remember
    ? "persistent"
    : "ephemeral";

  const pendingCookies: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.length = 0;
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  await supabase.auth.signOut({ scope: "local" });

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !signInData.user) {
    return redirectToLogin(request, "Invalid username or password.");
  }

  let { data: profile, error: profileError } = await supabase
    .from(TABLES.profiles)
    .select("id, email, full_name, role")
    .eq("id", signInData.user.id)
    .maybeSingle();

  const authEmail = (
    signInData.user.email ??
    email ??
    ""
  ).toLowerCase();

  if (!profileError && !profile) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const fullName =
        (signInData.user.user_metadata?.full_name as string | undefined) ??
        (usernameSlug || authEmail.split("@")[0] || "User");

      const { error: insertError } = await admin.from(TABLES.profiles).insert({
        id: signInData.user.id,
        email: authEmail || email,
        full_name: normalizeDisplayName(fullName),
        role: "judge",
      });

      if (insertError) {
        const { data } = await admin
          .from(TABLES.profiles)
          .select("id, email, full_name, role")
          .eq("id", signInData.user.id)
          .maybeSingle();
        profile = data;
      } else {
        const { data } = await admin
          .from(TABLES.profiles)
          .select("id, email, full_name, role")
          .eq("id", signInData.user.id)
          .maybeSingle();
        profile = data;
      }
      profileError = null;
    } catch {
      // fall through
    }
  }

  if (profileError || !profile || !isAppRole(profile.role)) {
    await supabase.auth.signOut({ scope: "local" });
    return redirectToLogin(
      request,
      "Signed in, but no profile was found. Contact an admin.",
    );
  }

  if (profile.role === "judge") {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: judge } = await admin
        .from(TABLES.judges)
        .select("id, active")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!judge || !judge.active) {
        await supabase.auth.signOut({ scope: "local" });
        return redirectToLogin(
          request,
          "No active account. An admin must activate your judge account before you can sign in.",
        );
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return redirectToLogin(
        request,
        "Unable to verify account status. Try again or contact an admin.",
      );
    }
  }

  const response = NextResponse.redirect(
    absoluteUrl(request, dashboardPathForRole(profile.role)),
    303,
  );

  response.cookies.set(SESSION_MODE_COOKIE, sessionMode, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(sessionMode === "persistent" ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });

  for (const { name, value, options } of pendingCookies) {
    const nextOptions = applySessionCookieOptions(
      {
        ...(options ?? {}),
        expires:
          typeof options?.expires === "number"
            ? new Date(options.expires)
            : options?.expires,
      },
      sessionMode,
    );
    response.cookies.set(name, value, nextOptions);
  }

  return response;
}
