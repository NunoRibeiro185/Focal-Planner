import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Integration tests: drive a throwaway Postgres (booted in globalSetup) to
// exercise RLS + the SECURITY DEFINER RPCs. Run with `npm run test:integration`.
// Not part of the default `npm test` (which excludes src/__tests__/integration).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/integration/**/*.test.ts"],
    globalSetup: ["./src/__tests__/integration/globalSetup.ts"],
    setupFiles: ["./src/__tests__/integration/setup.ts"],
    // Shared DB — keep files serial so pooled connections don't race.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
