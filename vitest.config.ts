import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    css: false,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
      "tests/tauri-plugins/**/*.{test,spec}.{ts,tsx}",
      "tests/contract/**/*.{test,spec}.{ts,tsx}",
      "tests/property/**/*.{test,spec}.{ts,tsx}",
      "tests/snapshot/**/*.{test,spec}.{ts,tsx}",
      "tests/a11y/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["tests/e2e/**", "tests/smoke/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage/frontend",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/**/*.d.ts",
        "src/test-utils/**",
      ],
      // Coverage gates enforced by `npm run test:coverage`. Tightening these
      // requires adding tests, not lowering thresholds. Values are set just
      // below current run so any regression fails CI but routine work doesn't
      // flap on small render-path edits.
      thresholds: {
        lines: 60,
        functions: 53,
        statements: 60,
        branches: 54,
      },
    },
  },
});
