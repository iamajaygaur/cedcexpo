"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import {
  checkPasswordResetEmailRateLimit,
  checkPasswordResetRateLimit,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TABLES } from "@/lib/supabase/tables";
import { getAppOrigin } from "@/lib/utils/app-url";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function clientKeyFromHeaders(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return h.get("x-real-ip") ?? "unknown";
}

const GENERIC_SENT_MESSAGE =
  "If that email belongs to an admin account, a reset link is on its way. Check your inbox and spam folder.";

/**
 * Request a Supabase recovery email for an admin account.
 * Always returns a generic success message to avoid account enumeration.
 */
export async function requestAdminPasswordResetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured()) {
      return actionFail(
        "Authentication is not configured. Add Supabase keys and try again.",
      );
    }

    const ipRate = await checkPasswordResetRateLimit(
      await clientKeyFromHeaders(),
    );
    if (!ipRate.allowed) {
      return actionFail(
        "Too many reset requests. Please wait a minute and try again.",
      );
    }

    const parsed = forgotPasswordSchema.safeParse({
      email: formString(formData, "email"),
    });
    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      );
    }

    const email = parsed.data.email.toLowerCase();
    const emailRate = await checkPasswordResetEmailRateLimit(email);
    if (!emailRate.allowed) {
      return actionFail(
        "Too many reset requests for this email. Please wait a few minutes.",
      );
    }

    // Only send recovery mail for confirmed admin profiles.
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from(TABLES.profiles)
      .select("id, role")
      .ilike("email", email)
      .maybeSingle();

    if (profile?.role === "admin") {
      const supabase = await createClient("persistent");
      const redirectTo = `${getAppOrigin()}/api/auth/callback?next=${encodeURIComponent("/reset-password")}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        // Still return generic copy — do not leak provider errors to strangers.
        console.error("[password-reset] resetPasswordForEmail failed", error.message);
      }
    }

    return actionOk(GENERIC_SENT_MESSAGE);
  } catch (e) {
    console.error("[password-reset] request failed", e);
    return actionOk(GENERIC_SENT_MESSAGE);
  }
}

/**
 * Set a new password after the recovery email link established a session.
 * Admin-only.
 */
export async function completeAdminPasswordResetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured()) {
      return actionFail("Authentication is not configured.");
    }

    const parsed = resetPasswordSchema.safeParse({
      new_password: formString(formData, "new_password"),
      confirm_password: formString(formData, "confirm_password"),
    });
    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Invalid password form.",
      );
    }

    const supabase = await createClient("persistent");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return actionFail(
        "This reset link has expired or is invalid. Request a new one.",
      );
    }

    const { data: profile } = await supabase
      .from(TABLES.profiles)
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      return actionFail(
        "Password reset from the login page is only available for admin accounts.",
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.new_password,
    });
    if (updateError) {
      return actionFail(updateError.message);
    }

    await supabase.auth.signOut();
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to update password.",
    );
  }

  redirect(
    "/login?notice=" +
      encodeURIComponent("Password updated. Sign in with your new password."),
  );
}
