import "server-only";

import { getSupabaseUrl } from "@/lib/supabase/env";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const EXT_BY_MIME: Record<(typeof AVATAR_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isAllowedAvatarMime(
  mime: string,
): mime is (typeof AVATAR_MIME_TYPES)[number] {
  return (AVATAR_MIME_TYPES as readonly string[]).includes(mime);
}

export function avatarObjectPath(userId: string, mime: string): string | null {
  if (!isAllowedAvatarMime(mime)) return null;
  return `${userId}/avatar.${EXT_BY_MIME[mime]}`;
}

/** Public object URL with a cache-busting query so updates show immediately. */
export function publicAvatarUrl(objectPath: string, cacheKey?: string): string {
  const base = getSupabaseUrl()?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  const url = `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
  if (!cacheKey) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(cacheKey)}`;
}

export function avatarFolderPrefix(userId: string): string {
  return `${userId}/`;
}
