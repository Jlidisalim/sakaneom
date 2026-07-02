// ────────────────────────────────────────────────────────────────────────────
// Expired-session handling. `requireAdmin()` throws "UNAUTHORIZED" server-side
// when the admin session is gone (expired, logged out elsewhere). This module
// detects that signal and lets the admin shell react — surfacing a re-login
// prompt WITHOUT unmounting the dashboard, so in-progress edits are preserved.
// It is pure (no React / no server imports) so it's safe in any bundle.
// ────────────────────────────────────────────────────────────────────────────

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "";
}

/** True when an error is the server's "session no longer valid" signal. */
export function isUnauthorizedError(err: unknown): boolean {
  // Match UNAUTHORIZED but NOT the role-denial "FORBIDDEN" signal (which must not
  // trigger the re-login overlay — the session is valid, the role just lacks the
  // capability).
  const m = messageOf(err);
  return /UNAUTHORIZED/i.test(m) && !/FORBIDDEN/i.test(m);
}

/** True when an error is the server's "your role can't do this" signal. */
export function isForbiddenError(err: unknown): boolean {
  return /FORBIDDEN/i.test(messageOf(err));
}

/** A French, user-facing message for a server error (role denial vs. generic). */
export function errorMessageFr(err: unknown, fallback = "Une erreur est survenue"): string {
  if (isForbiddenError(err)) return "Accès refusé — votre rôle ne permet pas cette action.";
  if (isUnauthorizedError(err)) return "Session expirée — reconnectez-vous.";
  return fallback;
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to "session expired" events. Returns an unsubscribe function. */
export function onUnauthorized(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Notify subscribers that the admin session is no longer valid. */
export function notifyUnauthorized(): void {
  for (const cb of [...listeners]) cb();
}
