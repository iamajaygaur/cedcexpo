"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import {
  buildPasswordHelpMarker,
  HELP_MARKER_PREFIX,
  notesHaveOpenPasswordHelp,
  parseLatestPasswordHelp,
  stripPasswordHelpMarkers,
} from "@/lib/auth/judge-help-markers";
import {
  authEmailFromUsername,
  toLoginUsername,
} from "@/lib/auth/username";
import {
  checkJudgeHelpRateLimit,
  checkJudgeHelpUsernameRateLimit,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TABLES } from "@/lib/supabase/tables";
import { judgeHelpRequestSchema } from "@/lib/validation/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const GENERIC_OK =
  "If that username matches a judge account, an administrator has been notified. You can also ask staff at the help desk.";

export type PasswordHelpRequest = {
  judgeId: string;
  fullName: string;
  username: string;
  requestedAt: string;
  note: string;
};

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

function usernameFromProfileEmail(email: string, fullName: string): string {
  if (email.endsWith("@cedc-expo.local")) {
    return email.slice(0, -"@cedc-expo.local".length);
  }
  const local = email.split("@")[0] ?? "";
  const fromEmail = toLoginUsername(local);
  if (fromEmail) return fromEmail;
  return toLoginUsername(fullName) || fullName;
}

/**
 * Public judge unlock request. Always returns a generic success message to
 * avoid account enumeration. Appends a marker to judges.notes (no migration).
 */
export async function requestJudgePasswordHelpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured()) {
      return actionFail(
        "Authentication is not configured. Ask an administrator for help.",
      );
    }

    const ipRate = await checkJudgeHelpRateLimit(await clientKeyFromHeaders());
    if (!ipRate.allowed) {
      return actionFail(
        "Too many help requests. Please wait a minute and try again.",
      );
    }

    const parsed = judgeHelpRequestSchema.safeParse({
      username: formString(formData, "username"),
      note: formString(formData, "note"),
    });
    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Enter your judge username.",
      );
    }

    const username = toLoginUsername(parsed.data.username);
    if (!username) {
      return actionOk(GENERIC_OK);
    }

    const userRate = await checkJudgeHelpUsernameRateLimit(username);
    if (!userRate.allowed) {
      return actionFail(
        "Too many help requests for this username. Please wait a few minutes.",
      );
    }

    const admin = createAdminClient();
    const synthetic = authEmailFromUsername(username);

    const { data: byEmail } = await admin
      .from(TABLES.profiles)
      .select("id, role")
      .eq("email", synthetic)
      .eq("role", "judge")
      .maybeSingle();

    let profileId = byEmail?.id ?? null;

    if (!profileId) {
      const { data: rpcEmail } = await admin.rpc("resolve_login_email", {
        p_username: username,
      });
      if (typeof rpcEmail === "string" && rpcEmail.length > 0) {
        const { data: byRpc } = await admin
          .from(TABLES.profiles)
          .select("id, role")
          .eq("email", rpcEmail)
          .eq("role", "judge")
          .maybeSingle();
        profileId = byRpc?.id ?? null;
      }
    }

    if (profileId) {
      const { data: judge } = await admin
        .from(TABLES.judges)
        .select("id, notes")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (judge) {
        const marker = buildPasswordHelpMarker(
          new Date().toISOString(),
          parsed.data.note,
        );
        const nextNotes = stripPasswordHelpMarkers(judge.notes || "");
        const combined = nextNotes ? `${nextNotes}\n${marker}` : marker;
        const { error } = await admin
          .from(TABLES.judges)
          .update({ notes: combined.slice(0, 4000) })
          .eq("id", judge.id);
        if (error) {
          console.error("[judge-help] notes update failed", error.message);
        }
      }
    }

    return actionOk(GENERIC_OK);
  } catch (e) {
    console.error("[judge-help] request failed", e);
    return actionOk(GENERIC_OK);
  }
}

export async function listOpenPasswordHelpRequests(
  supabase: SupabaseClient<Database>,
): Promise<PasswordHelpRequest[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.judges)
      .select("id, notes, profiles(full_name, email)")
      .ilike("notes", `%${HELP_MARKER_PREFIX}%`)
      .limit(50);

    if (error || !data) {
      if (error) {
        console.error("[judge-help] list failed", error.message);
      }
      return [];
    }

    const rows: PasswordHelpRequest[] = [];
    for (const row of data) {
      const help = parseLatestPasswordHelp(row.notes || "");
      if (!help) continue;
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      if (!profile) continue;
      rows.push({
        judgeId: row.id,
        fullName: profile.full_name || "Judge",
        username: usernameFromProfileEmail(profile.email, profile.full_name),
        requestedAt: help.requestedAt,
        note: help.note,
      });
    }

    rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return rows;
  } catch (e) {
    console.error("[judge-help] list failed", e);
    return [];
  }
}

/** Clear password-help markers after an admin resets the judge password. */
export async function clearJudgePasswordHelpMarkers(
  judgeId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: judge } = await admin
      .from(TABLES.judges)
      .select("notes")
      .eq("id", judgeId)
      .maybeSingle();
    if (!judge || !notesHaveOpenPasswordHelp(judge.notes || "")) return;
    await admin
      .from(TABLES.judges)
      .update({ notes: stripPasswordHelpMarkers(judge.notes || "") })
      .eq("id", judgeId);
  } catch (e) {
    console.error("[judge-help] clear markers failed", e);
  }
}

export async function resolveJudgePasswordHelpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminClient();
    const judgeId = formString(formData, "judge_id").trim();
    if (!judgeId) return actionFail("Missing judge.");

    await clearJudgePasswordHelpMarkers(judgeId);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/judges");
    return actionOk("Help request cleared.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Could not clear help request.",
    );
  }
}
