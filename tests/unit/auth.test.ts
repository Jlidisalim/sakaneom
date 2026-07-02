import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// auth.ts pulls in TanStack's server session helper at import time; stub it so
// these tests run in a plain node environment (no request context required).
vi.mock("@tanstack/react-start/server", () => ({
  useSession: () => ({
    data: {} as Record<string, unknown>,
    update: async () => {},
    clear: async () => {},
  }),
}));

const ORIGINAL_ENV = process.env;

describe("assertAuthConfig — production credential guard", () => {
  beforeEach(() => {
    vi.resetModules(); // re-evaluate the module-level NODE_ENV / cached config
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.ADMIN_EMAIL; // fall back to the dev bootstrap email
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("refuses to start in production with no secrets", async () => {
    process.env.NODE_ENV = "production";
    const { assertAuthConfig } = await import("@/server/auth");
    expect(() => assertAuthConfig()).toThrow(/Refusing to start/);
  });

  it("refuses in production when secrets are too short", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_PASSWORD = "short";
    process.env.ADMIN_SESSION_SECRET = "tooshort";
    const { assertAuthConfig } = await import("@/server/auth");
    expect(() => assertAuthConfig()).toThrow(/Refusing to start/);
  });

  it("boots in production with strong secrets", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_PASSWORD = "a-strong-password";
    process.env.ADMIN_SESSION_SECRET = "x".repeat(40);
    const { assertAuthConfig } = await import("@/server/auth");
    expect(() => assertAuthConfig()).not.toThrow();
  });

  it("falls back to dev bootstrap credentials outside production (and rejects wrong ones)", async () => {
    // Isolate the users store to an empty temp dir so the fresh-install bootstrap
    // path (hasNoUsers → true) is exercised deterministically.
    const tmp = await mkdtemp(join(tmpdir(), "sak-auth-"));
    process.env.DATA_DIR = join(tmp, "data");
    process.env.UPLOAD_DIR = join(tmp, "uploads");
    process.env.NODE_ENV = "development";
    try {
      const { assertAuthConfig, login } = await import("@/server/auth");
      expect(() => assertAuthConfig()).not.toThrow();
      // Fresh install: the dev bootstrap email + password create the first Super Admin.
      await expect(login("admin@sakaneom.tn", "sakaneom-admin")).resolves.toMatchObject({
        ok: true,
        role: "super_admin",
      });
      // Wrong password and empty inputs are rejected.
      await expect(login("admin@sakaneom.tn", "wrong-password")).resolves.toMatchObject({
        ok: false,
      });
      await expect(login("", "")).resolves.toMatchObject({ ok: false });
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
