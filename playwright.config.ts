import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

// Drives the REAL built Node server (the `node-server` Nitro output) against a
// throwaway, gitignored data dir — so the e2e proves the production persistence
// path, not a dev mock. Run `bun run build` first (CI does build → test:e2e).
const PORT = 3199;
const E2E_TMP = fileURLToPath(new URL("./.e2e-tmp", import.meta.url));

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node .output/server/index.mjs",
    url: `http://127.0.0.1:${PORT}`,
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      PORT: String(PORT),
      ADMIN_EMAIL: "admin@sakaneom.tn",
      ADMIN_PASSWORD: "e2e-admin-password",
      ADMIN_SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghij",
      DATA_DIR: `${E2E_TMP}/data`,
      UPLOAD_DIR: `${E2E_TMP}/uploads`,
    },
  },
});
