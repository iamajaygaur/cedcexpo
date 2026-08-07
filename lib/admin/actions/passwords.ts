"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/supabase/tables";
import {
  changeOwnPasswordSchema,
  setJudgePasswordSchema,
} from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Admin changes their own password (requires current password). */
export async function changeOwnPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, profile } = await requireAdminClient();
    const parsed = changeOwnPasswordSchema.safeParse({
      current_password: formString(formData, "current_password"),
      new_password: formString(formData, "new_password"),
      confirm_password: formString(formData, "confirm_password"),
    });

    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Invalid password form",
      );
    }

    const email = profile.email;
    if (!email) {
      return actionFail("Your account has no email on file.");
    }

    // Confirm current password before updating.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.current_password,
    });
    if (verifyError) {
      return actionFail("Current password is incorrect.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.new_password,
    });
    if (updateError) {
      return actionFail(updateError.message);
    }

    return actionOk("Your password was updated.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to change password",
    );
  }
}

/** Admin sets a new password for a judge account. */
export async function setJudgePasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminClient();
    const parsed = setJudgePasswordSchema.safeParse({
      id: formString(formData, "id"),
      new_password: formString(formData, "new_password"),
      confirm_password: formString(formData, "confirm_password"),
    });

    if (!parsed.success) {
      return actionFail(
        parsed.error.issues[0]?.message ?? "Invalid password form",
      );
    }

    const admin = createAdminClient();
    const { data: judge, error: loadError } = await admin
      .from(TABLES.judges)
      .select("profile_id")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (loadError || !judge) {
      return actionFail("Judge not found");
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      judge.profile_id,
      { password: parsed.data.new_password },
    );
    if (updateError) {
      return actionFail(updateError.message);
    }

    revalidatePath("/admin/judges");
    return actionOk("Judge password updated. Share it securely.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to set judge password",
    );
  }
}
