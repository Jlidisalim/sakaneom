import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Deliberately minimal — we do NOT load the Lovable/TanStack/Nitro build plugins
// for unit tests. We only need the `@/*` path alias (declared explicitly so it
// resolves for test files, which sit outside tsconfig's `include`) and a node env.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    pool: "forks", // isolate process.env / module-state mutations between files
  },
});
