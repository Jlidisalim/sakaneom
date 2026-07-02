// Request helpers for server functions. Lives under src/server/ so the h3/TanStack
// server utilities never leak into the client bundle.
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/**
 * Best-effort client IP for rate limiting. Behind nginx (see docs/DEPLOY.md) the
 * real client is the first hop in X-Forwarded-For; fall back to the socket IP.
 */
export function clientIp(): string {
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  try {
    return getRequestIP() ?? "unknown";
  } catch {
    return "unknown";
  }
}
