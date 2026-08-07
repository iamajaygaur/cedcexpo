"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { attemptLogin } from "@/lib/auth/login";
import { SESSION_MODE_COOKIE } from "@/lib/auth/session-mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  ok: boolean;
  message?: string;
};

/** Prefer POST /api/auth/login from the login form (password managers). */
export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = await attemptLogin(formData);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  redirect(result.redirectTo);
}

async function clearAuthCookiesAndSession() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Do not let sign-out errors block redirect to login.
    }
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_MODE_COOKIE, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
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
    // ignore
  }
}

export async function logoutAction(): Promise<void> {
  await clearAuthCookiesAndSession();
  redirect("/login");
}

/** Sign out and open the login form (even if cookies briefly linger). */
export async function switchAccountAction(): Promise<void> {
  await clearAuthCookiesAndSession();
  redirect("/login?switch=1");
}
