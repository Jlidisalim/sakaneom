// ────────────────────────────────────────────────────────────────────────────
// Error monitoring seam. Today it emits a structured line to stderr (so a log
// shipper / `journalctl` already captures it). To forward to Sentry, install
// `@sentry/node`, set SENTRY_DSN, and call its `captureException` inside
// `captureServerError` — the call sites below don't change. See docs/DEPLOY.md.
// ────────────────────────────────────────────────────────────────────────────

export function captureServerError(error: unknown, context: Record<string, unknown> = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  // Structured so it's greppable / parseable by a log pipeline.
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      name: err.name,
      message: err.message,
      ...context,
    }),
  );
  if (err.stack) console.error(err.stack);

  // ── Sentry hook (uncomment once @sentry/node + SENTRY_DSN are configured) ──
  // import * as Sentry from "@sentry/node";
  // Sentry.captureException(err, { extra: context });
}
