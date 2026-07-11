import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Unit tests (.test.ts) run in Node — no DOM overhead
    // Component tests (.test.tsx) will use jsdom via @vitest-environment directive
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    // Integration tests need Docker + a running Postgres — run them via
    // `npm run test:integration` (vitest.integration.config.mts), not here.
    exclude: ["**/node_modules/**", "src/__tests__/integration/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
