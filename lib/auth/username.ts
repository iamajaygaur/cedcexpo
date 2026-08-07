/**
 * Login username is firstname + lastname, lowercase, no spaces
 * (e.g. Ajay + Gaur → "ajaygaur").
 * Supabase Auth still needs an email, so we derive a synthetic address.
 */

export const AUTH_EMAIL_DOMAIN = "cedc-expo.local";

/** Collapse whitespace for display names. */
export function normalizeDisplayName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** Lowercase alphanumeric login slug (no spaces). */
export function toLoginUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 64);
}

export function usernameFromNameParts(
  firstName: string,
  lastName: string,
): string {
  return toLoginUsername(`${firstName}${lastName}`);
}

export function displayNameFromParts(
  firstName: string,
  lastName: string,
): string {
  return normalizeDisplayName(`${firstName} ${lastName}`);
}

export function parseLoginUsername(input: string): {
  ok: true;
  username: string;
} | {
  ok: false;
  message: string;
} {
  const username = toLoginUsername(input);
  if (username.length < 3) {
    return {
      ok: false,
      message: "Enter your username (e.g. ajaygaur).",
    };
  }
  if (!/^[a-z0-9]+$/.test(username)) {
    return {
      ok: false,
      message: "Username must be lowercase letters and numbers only.",
    };
  }
  return { ok: true, username };
}

/** Stable synthetic auth email from a login username. */
export function authEmailFromUsername(username: string): string {
  const slug = toLoginUsername(username) || "user";
  return `${slug}@${AUTH_EMAIL_DOMAIN}`;
}

/** Split a stored full name into first + last (last token = last name). */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = normalizeDisplayName(fullName).split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]!,
  };
}

/** @deprecated Use parseLoginUsername */
export function parseFullNameUsername(input: string) {
  return parseLoginUsername(input);
}

/** @deprecated Use normalizeDisplayName */
export function normalizeUsername(input: string) {
  return normalizeDisplayName(input);
}
