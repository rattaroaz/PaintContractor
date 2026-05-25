import { defineConfig, devices } from "@playwright/test";

const PORT = 1421;

export default defineConfig({
  testDir: "tests",
  testMatch: ["e2e/**/*.spec.ts", "smoke/**/*.spec.ts"],
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev:test`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_TAURI_MOCK: "1" },
  },
});
