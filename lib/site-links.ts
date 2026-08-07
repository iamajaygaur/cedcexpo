export const DEFAULT_SUPPORT_EMAIL = "engineering@ucdenver.edu";

export function supportMailto(email?: string | null, subject?: string) {
  const to = email?.trim() || DEFAULT_SUPPORT_EMAIL;
  const q = subject
    ? `?subject=${encodeURIComponent(subject)}`
    : "";
  return `mailto:${to}${q}`;
}
