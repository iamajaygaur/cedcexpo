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
const buckets = new Map<string, Bucket>();

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Expo venues often share one public IP. Keep this high enough for ~50 judges
 * arriving over a few minutes, while per-username limits still block guessing.
 * Override with LOGIN_RATE_LIMIT_MAX / LOGIN_RATE_LIMIT_WINDOW_MS.
 */
const LOGIN_WINDOW_MS = readPositiveInt("LOGIN_RATE_LIMIT_WINDOW_MS", 60_000);
const LOGIN_MAX_ATTEMPTS = readPositiveInt("LOGIN_RATE_LIMIT_MAX", 80);
const LOGIN_USERNAME_MAX = readPositiveInt("LOGIN_USERNAME_RATE_LIMIT_MAX", 8);
const EVAL_MUTATION_MAX = readPositiveInt("EVAL_MUTATION_RATE_LIMIT_MAX", 120);

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function checkKeyedRateLimit(
  key: string,
  opts: { windowMs: number; maxAttempts: number },
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
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
 * Rate-limit login attempts by client key (usually IP).
 * Default is venue-friendly (80/min) so shared Wi‑Fi does not lock out judges.
 */
export function checkLoginRateLimit(clientKey: string): RateLimitResult {
  return checkKeyedRateLimit(`login:${clientKey || "unknown"}`, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_MAX_ATTEMPTS,
  });
}

/**
 * Tighter per-username limit so password guessing stays constrained even when
 * the shared-venue IP limit is raised for expo day.
 */
export function checkLoginUsernameRateLimit(username: string): RateLimitResult {
  const key = username.trim().toLowerCase() || "unknown";
  return checkKeyedRateLimit(`login-user:${key}`, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_USERNAME_MAX,
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
 * Rate-limit evaluation draft saves / submits.
 * Prefer a per-judge (or per-user) key so venue Wi‑Fi does not share one bucket.
 */
export function checkEvaluationMutationRateLimit(
  clientKey: string,
): RateLimitResult {
  return checkKeyedRateLimit(`eval-mutation:${clientKey || "unknown"}`, {
    windowMs: 60_000,
    maxAttempts: EVAL_MUTATION_MAX,
  });
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
