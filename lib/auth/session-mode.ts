/**
 * Controls whether auth cookies survive browser/app close.
 * - ephemeral: session cookies (no Max-Age) — preferred for shared judging devices
 * - persistent: long-lived cookies when "Remember Me" is checked
 */
export const SESSION_MODE_COOKIE = "cedc-session-mode";

export type SessionMode = "ephemeral" | "persistent";

export function isEphemeralSessionMode(
  value: string | undefined | null,
): boolean {
  return value === "ephemeral" || value === "" || value == null;
}

/**
 * Strip Max-Age / Expires so the browser treats auth cookies as session cookies.
 * They are cleared when the browser/app session ends (desktop) or Safari is quit.
 */
export function applySessionCookieOptions<
  T extends { maxAge?: number; expires?: Date },
>(options: T | undefined, mode: SessionMode): T {
  const base = { ...(options ?? ({} as T)) };
  if (mode === "ephemeral") {
    delete (base as { maxAge?: number }).maxAge;
    delete (base as { expires?: Date }).expires;
  }
  return base;
}
