"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { requireSessionProfile } from "@/lib/auth/session";
import {
  clearExistingAvatarObjects,
  writeAvatarForProfile,
} from "@/lib/profile/avatar-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";

function revalidateProfileSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/judge/settings");
  revalidatePath("/admin/judges");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/monitor");
}

export async function uploadOwnAvatarAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const profile = await requireSessionProfile();
    const supabase = await createClient();
    const file = formData.get("avatar");

    if (!(file instanceof File) || file.size === 0) {
      return actionFail("Choose an image to upload.");
    }

    const result = await writeAvatarForProfile({
      supabase,
      profileId: profile.id,
      file,
    });
    if (result.ok) revalidateProfileSurfaces();
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update profile photo.";
    return actionFail(message);
  }
}

export async function removeOwnAvatarAction(
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  try {
    const profile = await requireSessionProfile();
    const supabase = await createClient();

    await clearExistingAvatarObjects(supabase, profile.id);

    const { error: updateError } = await supabase
      .from(TABLES.profiles)
      .update({ avatar_url: null })
      .eq("id", profile.id);

    if (updateError) {
      return actionFail(updateError.message || "Could not remove profile photo.");
    }

    revalidateProfileSurfaces();
    return actionOk("Profile photo removed.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not remove profile photo.";
    return actionFail(message);
  }
}

/** Admin sets a judge's photo (service role — can write into that user's folder). */
export async function uploadJudgeAvatarAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminClient();
    const admin = createAdminClient();
    const judgeId = String(formData.get("judge_id") ?? "").trim();
    const file = formData.get("avatar");

    if (!judgeId) return actionFail("Missing judge id.");
    if (!(file instanceof File) || file.size === 0) {
      return actionFail("Choose an image to upload.");
    }

    const { data: judge, error: loadError } = await admin
      .from(TABLES.judges)
      .select("profile_id")
      .eq("id", judgeId)
      .maybeSingle();

    if (loadError || !judge?.profile_id) {
      return actionFail("Judge not found.");
    }

    const result = await writeAvatarForProfile({
      supabase: admin,
      profileId: judge.profile_id,
      file,
    });
    if (result.ok) revalidateProfileSurfaces();
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update judge photo.";
    return actionFail(message);
  }
}

export async function removeJudgeAvatarAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminClient();
    const admin = createAdminClient();
    const judgeId = String(formData.get("judge_id") ?? "").trim();
    if (!judgeId) return actionFail("Missing judge id.");

    const { data: judge, error: loadError } = await admin
      .from(TABLES.judges)
      .select("profile_id")
      .eq("id", judgeId)
      .maybeSingle();

    if (loadError || !judge?.profile_id) {
      return actionFail("Judge not found.");
    }

    await clearExistingAvatarObjects(admin, judge.profile_id);

    const { error: updateError } = await admin
      .from(TABLES.profiles)
      .update({ avatar_url: null })
      .eq("id", judge.profile_id);

    if (updateError) {
      return actionFail(updateError.message || "Could not remove judge photo.");
    }

    revalidateProfileSurfaces();
    return actionOk("Profile photo removed.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not remove judge photo.";
    return actionFail(message);
  }
}
