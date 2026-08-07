/**
 * Public app origin for QR links (not used for auth redirects).
 * Prefer an explicit LAN/production URL when devices other than this machine
 * need to open the app. Auth redirects use the request Host header instead.
 */
export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function teamQrUrl(qrIdentifier: string): string {
  return `${getAppOrigin()}/judge/team/${encodeURIComponent(qrIdentifier)}`;
}
