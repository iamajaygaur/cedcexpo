import type { AppRole } from "@/lib/permissions/roles";
import { dashboardPathForRole } from "@/lib/auth/session";

/**
 * Validate a post-login `next` path for the signed-in role.
 * Only same-origin absolute paths under that role’s area are allowed.
 */
export function safeNextPathForRole(
  next: string | null | undefined,
  role: AppRole,
): string {
  const fallback = dashboardPathForRole(role);
  if (!next) return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;

  if (role === "admin" && trimmed.startsWith("/admin")) return trimmed;
  if (role === "judge" && trimmed.startsWith("/judge")) return trimmed;

  return fallback;
}
