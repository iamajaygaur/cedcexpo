import type { NextRequest } from "next/server";

/**
 * Resolve the public origin the browser used for this request.
 * Prefer Host / forwarded headers over `request.url`, which in Next.js
 * often stays on localhost even when the client opened a LAN IP — that
 * breaks post-login redirects on phones ("site can't be reached").
 */
export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = forwardedHost ?? request.headers.get("host");
  const host = hostHeader?.split(",")[0]?.trim();

  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    let proto = forwardedProto?.split(",")[0]?.trim();

    if (!proto) {
      const isLocal =
        host.startsWith("localhost") ||
        host.startsWith("127.0.0.1") ||
        host.startsWith("0.0.0.0") ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
      proto = isLocal ? "http" : "https";
    }

    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

/** Build an absolute URL for redirects that stays on the client's host. */
export function absoluteUrl(request: NextRequest, pathname: string): URL {
  const origin = getRequestOrigin(request);
  return new URL(pathname, `${origin}/`);
}
