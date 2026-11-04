import "server-only";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarObjectPath,
  isAllowedAvatarMime,
  publicAvatarUrl,
} from "@/lib/profile/avatar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";

export type StorageClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

export async function clearExistingAvatarObjects(
  supabase: StorageClient,
  userId: string,
) {
  const { data: existing } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId, { limit: 20 });

  if (!existing?.length) return;

  const objectPaths = existing.map((f) => `${userId}/${f.name}`);
  if (objectPaths.length) {
    await supabase.storage.from(AVATAR_BUCKET).remove(objectPaths);
  }
}

/** Upload / replace a profile photo and set profiles.avatar_url. */
export async function writeAvatarForProfile(params: {
  supabase: StorageClient;
  profileId: string;
  file: File;
}): Promise<ActionResult> {
  const { supabase, profileId, file } = params;

  if (file.size > AVATAR_MAX_BYTES) {
    return actionFail("Image must be 2 MB or smaller.");
  }

  const mime = file.type || "";
  if (!isAllowedAvatarMime(mime)) {
    return actionFail("Use a JPEG, PNG, WebP, or GIF image.");
  }

  const objectPath = avatarObjectPath(profileId, mime);
  if (!objectPath) {
    return actionFail("Unsupported image type.");
  }

  await clearExistingAvatarObjects(supabase, profileId);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, bytes, {
      contentType: mime,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return actionFail(uploadError.message || "Could not upload image.");
  }

  const avatarUrl = publicAvatarUrl(objectPath, String(Date.now()));
  const { error: updateError } = await supabase
    .from(TABLES.profiles)
    .update({ avatar_url: avatarUrl })
    .eq("id", profileId);

  if (updateError) {
    return actionFail(updateError.message || "Could not save profile photo.");
  }

  return actionOk("Profile photo updated.");
}
