import { afterEach, describe, expect, it } from "vitest";

import { _resetRateLimiter, rateLimit } from "@/server/rate-limit";

afterEach(() => _resetRateLimiter());

describe("rateLimit", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit("k", opts, 1000).ok).toBe(true);
    expect(rateLimit("k", opts, 1000).ok).toBe(true);
    expect(rateLimit("k", opts, 1000).ok).toBe(true);
    expect(rateLimit("k", opts, 1000).ok).toBe(false);
  });

  it("resets after the window elapses", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("k", opts, 0).ok).toBe(true);
    expect(rateLimit("k", opts, 500).ok).toBe(false);
    expect(rateLimit("k", opts, 1000).ok).toBe(true);
  });

  it("applies a lockout that outlasts the window, with retryAfter", () => {
    const opts = { limit: 1, windowMs: 1000, blockMs: 5000 };
    expect(rateLimit("k", opts, 0).ok).toBe(true);
    const breach = rateLimit("k", opts, 100);
    expect(breach.ok).toBe(false);
    expect(breach.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit("k", opts, 2000).ok).toBe(false); // still locked past the window
    expect(rateLimit("k", opts, 5200).ok).toBe(true); // lockout expired
  });

  it("keeps separate keys independent", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("a", opts, 0).ok).toBe(true);
    expect(rateLimit("b", opts, 0).ok).toBe(true);
  });
});
