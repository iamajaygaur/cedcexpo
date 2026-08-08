import "server-only";

import { cookies, headers } from "next/headers";

import { dashboardPathForRole } from "@/lib/auth/session";
import { SESSION_MODE_COOKIE } from "@/lib/auth/session-mode";
import {
  authEmailFromUsername,
  normalizeDisplayName,
  parseLoginUsername,
  toLoginUsername,
} from "@/lib/auth/username";
import { checkLoginRateLimit, checkLoginUsernameRateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { isAppRole } from "@/lib/permissions/roles";
import { TABLES } from "@/lib/supabase/tables";
import type { UserRole } from "@/types/database";

export type LoginAttemptResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
};

function clientKeyFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip") ?? "unknown";
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

async function ensureMissingProfile(params: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<ProfileRow | null> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from(TABLES.profiles)
      .select("id, email, full_name, role")
      .eq("id", params.userId)
      .maybeSingle();

    if (existing && isAppRole(existing.role)) {
      return existing;
    }

    const { error: insertError } = await admin.from(TABLES.profiles).insert({
      id: params.userId,
      email: params.email,
      full_name: normalizeDisplayName(params.fullName),
      role: "judge",
    });

    if (insertError) {
      const { data } = await admin
        .from(TABLES.profiles)
        .select("id, email, full_name, role")
        .eq("id", params.userId)
        .maybeSingle();
      if (!data || !isAppRole(data.role)) return null;
      return data;
    }

    const { data } = await admin
      .from(TABLES.profiles)
      .select("id, email, full_name, role")
      .eq("id", params.userId)
      .maybeSingle();

    if (!data || !isAppRole(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

async function resolveLoginEmail(identifier: string): Promise<string | null> {
  if (looksLikeEmail(identifier)) {
    return identifier.trim().toLowerCase();
  }

  const username = toLoginUsername(identifier);
  if (!username) return null;

  const synthetic = authEmailFromUsername(username);

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: byEmail } = await admin
      .from(TABLES.profiles)
      .select("email")
      .eq("email", synthetic)
      .maybeSingle();

    if (byEmail?.email) {
      return byEmail.email;
    }

    const { data: rpcEmail, error } = await admin.rpc("resolve_login_email", {
      p_username: username,
    });

    if (!error && typeof rpcEmail === "string" && rpcEmail.length > 0) {
      return rpcEmail;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Shared login for HTML POST /api/auth/login (password managers need a real
 * form navigation) and the optional server action wrapper.
 */
export async function attemptLogin(
  formData: FormData,
): Promise<LoginAttemptResult> {
  const headerList = await headers();
  const rate = checkLoginRateLimit(clientKeyFromHeaders(headerList));
  if (!rate.allowed) {
    return {
      ok: false,
      message: "Too many sign-in attempts. Please wait a minute and try again.",
    };
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
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid credentials.",
    };
  }

  const userRate = checkLoginUsernameRateLimit(parsed.data.username);
  if (!userRate.allowed) {
    return {
      ok: false,
      message:
        "Too many sign-in attempts for this account. Please wait a minute and try again.",
    };
  }

  const rawIdentifier = parsed.data.username.trim();
  let email: string | null = null;
  let usernameSlug = "";

  if (looksLikeEmail(rawIdentifier)) {
    email = rawIdentifier.toLowerCase();
  } else {
    const nameParsed = parseLoginUsername(rawIdentifier);
    if (!nameParsed.ok) {
      return { ok: false, message: nameParsed.message };
    }
    usernameSlug = nameParsed.username;
    email =
      (await resolveLoginEmail(usernameSlug)) ??
      authEmailFromUsername(usernameSlug);
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY) in .env.local.",
    };
  }

  const cookieStore = await cookies();
  const sessionMode = parsed.data.remember ? "persistent" : "ephemeral";
  cookieStore.set(SESSION_MODE_COOKIE, sessionMode, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(parsed.data.remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });

  const supabase = await createClient(sessionMode);

  await supabase.auth.signOut({ scope: "local" });

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !signInData.user) {
    return {
      ok: false,
      message: "Invalid username or password.",
    };
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
    const fullName =
      (signInData.user.user_metadata?.full_name as string | undefined) ??
      (usernameSlug || authEmail.split("@")[0] || "User");

    const ensured = await ensureMissingProfile({
      userId: signInData.user.id,
      email: authEmail || email,
      fullName,
    });

    if (ensured) {
      profile = ensured;
      profileError = null;
    }
  }

  if (profileError || !profile || !isAppRole(profile.role)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message:
        "Signed in, but no profile was found. Run the profile backfill SQL in Supabase (see AUTH_SETUP), then try again.",
    };
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
        return {
          ok: false,
          message:
            "No active account. An admin must activate your judge account before you can sign in.",
        };
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return {
        ok: false,
        message:
          "Unable to verify account status. Try again or contact an admin.",
      };
    }
  }

  return { ok: true, redirectTo: dashboardPathForRole(profile.role) };
}
