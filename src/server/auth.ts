// ────────────────────────────────────────────────────────────────────────────
// Admin authentication & authorization.
//
// Per-USER accounts (email + scrypt-hashed password, see users.ts) authenticate
// against the same encrypted, httpOnly session cookie via TanStack Start's
// session API. The cookie now carries { userId, role } so every server function
// can enforce role/capability (the REAL security boundary — see permissions.ts).
//
// Configure in production via env:
//   ADMIN_SESSION_SECRET   — 32+ char secret used to seal the session cookie
//   ADMIN_EMAIL            — bootstrap Super Admin email (first-run / seed)
//   ADMIN_PASSWORD         — bootstrap Super Admin password (first-run / seed)
// Sensible dev defaults are used when these are unset (with a console warning).
// On a fresh install with an empty users store, the bootstrap credentials create
// the first Super Admin on first login so the admin is never locked out.
// ────────────────────────────────────────────────────────────────────────────
import { useSession } from "@tanstack/react-start/server";

import { hasCap, type Capability, type Role } from "@/lib/promo/permissions";
import { addUser, hasNoUsers, verifyLogin } from "./users";

const SESSION_NAME = "sakaneom_admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const MIN_PASSWORD = 12;
const MIN_SECRET = 32;

const IS_PROD = process.env.NODE_ENV === "production";

// Dev-only fallbacks. These NEVER apply in production (see loadAuthConfig).
const DEV_PASSWORD = "sakaneom-admin";
const DEV_SECRET = "sakaneom-dev-session-secret-change-me-please-32+";
const DEV_EMAIL = "admin@sakaneom.tn";

type AuthConfig = { email: string; password: string; secret: string };
let cachedConfig: AuthConfig | null = null;
let warnedDev = false;

/**
 * Resolve and validate the admin credentials.
 *
 * In production, throws if ADMIN_PASSWORD/ADMIN_SESSION_SECRET are missing or too
 * short — the server refuses to start rather than fall back to a known default
 * (which would mean a publicly-documented login + a forgeable session cookie).
 * Outside production, missing values fall back to dev defaults with a warning.
 */
function loadAuthConfig(): AuthConfig {
  if (cachedConfig) return cachedConfig;

  const email = process.env.ADMIN_EMAIL?.trim() || DEV_EMAIL;
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";

  if (IS_PROD) {
    const problems: string[] = [];
    if (password.length < MIN_PASSWORD)
      problems.push(`ADMIN_PASSWORD must be set and ≥ ${MIN_PASSWORD} chars`);
    if (secret.length < MIN_SECRET)
      problems.push(`ADMIN_SESSION_SECRET must be set and ≥ ${MIN_SECRET} chars`);
    if (problems.length) {
      throw new Error(
        `[admin] Refusing to start in production — ${problems.join("; ")}. ` +
          `Set them in the environment (see .env.example / docs/DEPLOY.md).`,
      );
    }
    cachedConfig = { email, password, secret };
    return cachedConfig;
  }

  if (!password || !secret) {
    if (!warnedDev) {
      warnedDev = true;
      console.warn(
        `[admin] Using DEV auth defaults (NODE_ENV=${process.env.NODE_ENV ?? "undefined"}). ` +
          `Set ADMIN_PASSWORD (≥${MIN_PASSWORD}) and ADMIN_SESSION_SECRET (≥${MIN_SECRET}) for production. ` +
          `Dev bootstrap login is "${DEV_EMAIL}" / "${DEV_PASSWORD}".`,
      );
    }
  }
  const devSecret = secret.length >= MIN_SECRET ? secret : DEV_SECRET;
  cachedConfig = { email, password: password || DEV_PASSWORD, secret: devSecret };
  return cachedConfig;
}

/** Validate the auth config eagerly (called from the server entry at startup). */
export function assertAuthConfig(): void {
  loadAuthConfig();
}

type SessionData = { authed?: boolean; userId?: string; role?: Role; at?: number };

function adminSession() {
  // `useSession` here is TanStack Start's SERVER session helper, not a React
  // hook — the rules-of-hooks lint rule misfires on the "use" prefix.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSession<SessionData>({
    name: SESSION_NAME,
    password: loadAuthConfig().secret,
    maxAge: SESSION_MAX_AGE,
    // Be explicit about the session-cookie flags rather than trusting framework
    // defaults: httpOnly (no JS access), Secure in production (HTTPS-only), and
    // SameSite=Lax (CSRF defense that still survives top-level navigation to /admin).
    cookie: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
    },
  });
}

/** Constant-time-ish string comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type AuthState = { authed: boolean; userId?: string; role?: Role };

export async function isAuthed(): Promise<boolean> {
  const session = await adminSession();
  return session.data.authed === true;
}

/** The current session's auth state (role + user id). */
export async function currentAuth(): Promise<AuthState> {
  const session = await adminSession();
  if (session.data.authed !== true) return { authed: false };
  // Legacy cookies minted before roles existed only belonged to the single shared
  // admin → treat them as super_admin.
  return {
    authed: true,
    userId: session.data.userId,
    role: session.data.role ?? "super_admin",
  };
}

/**
 * Require an authenticated session. Throws "UNAUTHORIZED" otherwise (the existing
 * re-login signal). Returns the resolved { userId, role }.
 */
export async function requireAuth(): Promise<{ userId: string; role: Role }> {
  const session = await adminSession();
  if (session.data.authed !== true) throw new Error("UNAUTHORIZED");
  return { userId: session.data.userId ?? "", role: session.data.role ?? "super_admin" };
}

/**
 * Back-compat alias: "is an authenticated admin". Used by reads/uploads open to
 * any signed-in user. Mutations should prefer requireRole/requireCap.
 */
export async function requireAdmin(): Promise<void> {
  await requireAuth();
}

/** Require one of the given roles. Throws "FORBIDDEN" (distinct from re-login). */
export async function requireRole(...roles: Role[]): Promise<{ userId: string; role: Role }> {
  const auth = await requireAuth();
  if (!roles.includes(auth.role)) throw new Error("FORBIDDEN");
  return auth;
}

/** Require a capability (resource:action). Throws "FORBIDDEN" when missing. */
export async function requireCap(cap: Capability): Promise<{ userId: string; role: Role }> {
  const auth = await requireAuth();
  if (!hasCap(auth.role, cap)) throw new Error("FORBIDDEN");
  return auth;
}

/**
 * Verify email + password and, on success, establish the session. On a fresh
 * install (no users yet) the bootstrap env credentials create the first Super
 * Admin so the admin is never locked out.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ ok: boolean; role?: Role }> {
  if (!email || !password) return { ok: false };

  if (await hasNoUsers()) {
    const cfg = loadAuthConfig();
    if (
      email.trim().toLowerCase() === cfg.email.trim().toLowerCase() &&
      safeEqual(password, cfg.password)
    ) {
      const u = await addUser({
        nom: "Super Admin",
        email: cfg.email,
        role: "super_admin",
        active: true,
        password,
      });
      const session = await adminSession();
      await session.update({ authed: true, userId: u.id, role: "super_admin", at: Date.now() });
      return { ok: true, role: "super_admin" };
    }
  }

  const user = await verifyLogin(email, password);
  if (!user) return { ok: false };
  const session = await adminSession();
  await session.update({ authed: true, userId: user.id, role: user.role, at: Date.now() });
  return { ok: true, role: user.role };
}

export async function logout(): Promise<void> {
  const session = await adminSession();
  await session.clear();
}
