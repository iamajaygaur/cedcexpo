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

/** In-memory fixed window — single-node / local; Upstash used when configured. */
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

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

async function upstashCommand(
  args: (string | number)[],
): Promise<unknown | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown };
    return data.result ?? null;
  } catch {
    return null;
  }
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function checkMemoryRateLimit(
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
 * Optional Upstash fixed-window limiter. Returns null on any failure so callers
 * fall back to in-memory — never blocks login/eval when Redis is down.
 */
async function checkUpstashRateLimit(
  key: string,
  opts: { windowMs: number; maxAttempts: number },
): Promise<RateLimitResult | null> {
  if (!upstashConfigured()) return null;

  const redisKey = `cedc:rl:${key}`;
  const countRaw = await upstashCommand(["INCR", redisKey]);
  if (typeof countRaw !== "number" || !Number.isFinite(countRaw)) {
    return null;
  }

  if (countRaw === 1) {
    const expireOk = await upstashCommand([
      "PEXPIRE",
      redisKey,
      opts.windowMs,
    ]);
    if (expireOk === null) {
      // Best-effort cleanup if expire failed; still use the count this request.
      void upstashCommand(["DEL", redisKey]);
    }
  }

  if (countRaw > opts.maxAttempts) {
    const ttlRaw = await upstashCommand(["PTTL", redisKey]);
    const ttlMs =
      typeof ttlRaw === "number" && ttlRaw > 0 ? ttlRaw : opts.windowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, opts.maxAttempts - countRaw),
  };
}

async function checkKeyedRateLimit(
  key: string,
  opts: { windowMs: number; maxAttempts: number },
): Promise<RateLimitResult> {
  const distributed = await checkUpstashRateLimit(key, opts);
  if (distributed) return distributed;
  return checkMemoryRateLimit(key, opts);
}

/**
 * Rate-limit login attempts by client key (usually IP).
 * Default is venue-friendly (80/min) so shared Wi‑Fi does not lock out judges.
 */
export async function checkLoginRateLimit(
  clientKey: string,
): Promise<RateLimitResult> {
  return checkKeyedRateLimit(`login:${clientKey || "unknown"}`, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_MAX_ATTEMPTS,
  });
}

/**
 * Tighter per-username limit so password guessing stays constrained even when
 * the shared-venue IP limit is raised for expo day.
 */
export async function checkLoginUsernameRateLimit(
  username: string,
): Promise<RateLimitResult> {
  const key = username.trim().toLowerCase() || "unknown";
  return checkKeyedRateLimit(`login-user:${key}`, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_USERNAME_MAX,
  });
}

/**
 * Rate-limit admin forgot-password requests (IP + email).
 */
export async function checkPasswordResetRateLimit(
  clientKey: string,
): Promise<RateLimitResult> {
  return checkKeyedRateLimit(`pwd-reset:${clientKey || "unknown"}`, {
    windowMs: 60_000,
    maxAttempts: 5,
  });
}

export async function checkPasswordResetEmailRateLimit(
  email: string,
): Promise<RateLimitResult> {
  const key = email.trim().toLowerCase() || "unknown";
  return checkKeyedRateLimit(`pwd-reset-email:${key}`, {
    windowMs: 15 * 60_000,
    maxAttempts: 3,
  });
}

/** Judge password-help requests (public form). */
export async function checkJudgeHelpRateLimit(
  clientKey: string,
): Promise<RateLimitResult> {
  return checkKeyedRateLimit(`judge-help:${clientKey || "unknown"}`, {
    windowMs: 60_000,
    maxAttempts: 5,
  });
}

export async function checkJudgeHelpUsernameRateLimit(
  username: string,
): Promise<RateLimitResult> {
  const key = username.trim().toLowerCase() || "unknown";
  return checkKeyedRateLimit(`judge-help-user:${key}`, {
    windowMs: 15 * 60_000,
    maxAttempts: 3,
  });
}

/**
 * Rate-limit CSV / report exports (admin).
 */
export async function checkExportRateLimit(
  clientKey: string,
): Promise<RateLimitResult> {
  return checkKeyedRateLimit(`export:${clientKey || "unknown"}`, {
    windowMs: 60_000,
    maxAttempts: 20,
  });
}

/**
 * Rate-limit evaluation draft saves / submits.
 * Prefer a per-judge (or per-user) key so venue Wi‑Fi does not share one bucket.
 */
export async function checkEvaluationMutationRateLimit(
  clientKey: string,
): Promise<RateLimitResult> {
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
export async function checkRateLimitStub(
  request: NextRequest,
): Promise<RateLimitResult> {
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
