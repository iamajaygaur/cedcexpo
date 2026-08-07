/**
 * Role type guards — no session imports (avoid circular deps with lib/auth/session).
 * Never trust client-supplied role strings for authorization.
 */

export type AppRole = "admin" | "judge";

export function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "judge";
}
