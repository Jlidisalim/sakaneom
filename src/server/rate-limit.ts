// ────────────────────────────────────────────────────────────────────────────
// In-memory fixed-window rate limiter with optional lockout. Suitable for the
// SINGLE-instance deploy (see docs/DEPLOY.md) — state lives in this process. For
// a multi-instance deploy, back this with shared storage (Redis/KV).
// ────────────────────────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number; blockedUntil: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000; // backstop against unbounded growth

export type RateOptions = {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
  /** If set, breaching the limit blocks the key for this long (lockout). */
  blockMs?: number;
};

export type RateResult = { ok: boolean; retryAfterSec: number };

function prune(now: number): void {
  if (buckets.size < MAX_KEYS) return;
  for (const [k, b] of buckets) {
    if (now >= b.resetAt && now >= b.blockedUntil) buckets.delete(k);
  }
}

/**
 * Record a hit for `key` and report whether it's allowed. `now` is passed in so
 * callers control the clock (and it's testable).
 */
export function rateLimit(key: string, opts: RateOptions, now: number): RateResult {
  const existing = buckets.get(key);

  if (existing && now < existing.blockedUntil) {
    return { ok: false, retryAfterSec: Math.ceil((existing.blockedUntil - now) / 1000) };
  }

  if (!existing || now >= existing.resetAt) {
    prune(now);
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs, blockedUntil: 0 });
    return { ok: true, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    if (opts.blockMs) existing.blockedUntil = now + opts.blockMs;
    const until = existing.blockedUntil || existing.resetAt;
    return { ok: false, retryAfterSec: Math.ceil((until - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Test/maintenance helper — clears all buckets. */
export function _resetRateLimiter(): void {
  buckets.clear();
}
