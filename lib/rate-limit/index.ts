import type { NextRequest } from "next/server";

export type RateLimitResult = {
  allowed: boolean;
  remaining?: number;
  retryAfterSeconds?: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

/** In-memory sliding window — good enough for single-node / local; replace with Redis in prod scale-out. */
const loginAttempts = new Map<string, Bucket>();

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 10;

function pruneExpired(now: number) {
  for (const [key, bucket] of loginAttempts) {
    if (bucket.resetAt <= now) {
      loginAttempts.delete(key);
    }
  }
}

/**
 * Rate-limit login attempts by client key (IP).
 * Returns remaining attempts for UX if desired.
 */
export function checkLoginRateLimit(clientKey: string): RateLimitResult {
  return checkKeyedRateLimit(`login:${clientKey || "unknown"}`, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_MAX_ATTEMPTS,
  });
}

/**
 * Rate-limit CSV / report exports (admin).
 */
export function checkExportRateLimit(clientKey: string): RateLimitResult {
  return checkKeyedRateLimit(`export:${clientKey || "unknown"}`, {
    windowMs: 60_000,
    maxAttempts: 20,
  });
}

/**
 * Rate-limit evaluation draft saves / submits (judge).
 */
export function checkEvaluationMutationRateLimit(
  clientKey: string,
): RateLimitResult {
  return checkKeyedRateLimit(`eval-mutation:${clientKey || "unknown"}`, {
    windowMs: 60_000,
    maxAttempts: 120,
  });
}

function checkKeyedRateLimit(
  key: string,
  opts: { windowMs: number; maxAttempts: number },
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = loginAttempts.get(key);

  if (!existing || existing.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.maxAttempts - 1 };
  }

  if (existing.count >= opts.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.maxAttempts - existing.count,
  };
}

/**
 * Generic path-aware stub used by middleware for non-login routes.
 * Login POSTs are enforced via checkLoginRateLimit in the server action;
 * middleware applies a lighter IP throttle on /login.
 */
export function checkRateLimitStub(request: NextRequest): RateLimitResult {
  const path = request.nextUrl.pathname;
  if (path === "/login" && request.method === "POST") {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    return checkLoginRateLimit(ip);
  }
  return { allowed: true };
}
