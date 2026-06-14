/**
 * Playwright E2E for the in-app updater UI.
 * Uses window.__paintUpdaterMock (wired in updateService when VITE_TAURI_MOCK=1).
 */
import { expect, test } from "@playwright/test";

type UpdaterScenario =
  | { kind: "up_to_date" }
  | { kind: "available"; version: string }
  | { kind: "feed_missing" }
  | { kind: "platform_missing" }
  | { kind: "download_fail" };

function installUpdaterMock(scenario: UpdaterScenario) {
  return `
    (() => {
      window.__paintUpdaterMock = {
        check: async () => {
          ${scenario.kind === "up_to_date" ? "return null;" : ""}
          ${
            scenario.kind === "available"
              ? `return {
                  version: ${JSON.stringify(scenario.version)},
                  downloadAndInstall: async (onEvent) => {
                    onEvent?.({ event: "Started" });
                    onEvent?.({ event: "Finished" });
                  },
                };`
              : ""
          }
          ${
            scenario.kind === "feed_missing"
              ? 'throw new Error("Could not fetch a valid release JSON");'
              : ""
          }
          ${
            scenario.kind === "platform_missing"
              ? 'throw new Error(\'None of the fallback platforms `["windows-aarch64"]` were found in the response `platforms` object\');'
              : ""
          }
          ${
            scenario.kind === "download_fail"
              ? `return {
                  version: "999.0.0",
                  downloadAndInstall: async () => {
                    throw new Error("signature verification failed");
                  },
                };`
              : ""
          }
        },
        relaunch: async () => {
          window.__relaunchCalled = true;
        },
      };
    })();
  `;
}

async function openUpdatesAndCheck(page: import("@playwright/test").Page) {
  await page.goto("/settings/updates");
  await expect(page.getByText(/version:/i)).toBeVisible();
  await page.getByRole("button", { name: /check for updates/i }).click();
}

test.describe("Updater UI", () => {
  test("shows up to date dialog when mock feed has no newer release", async ({
    page,
  }) => {
    await page.addInitScript(installUpdaterMock({ kind: "up_to_date" }));
    await openUpdatesAndCheck(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /up to date/i })).toBeVisible();
    await expect(dialog.getByText(/is up to date/i)).toBeVisible();
    await dialog.getByRole("button", { name: /close/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("progresses through download and install for a newer release", async ({
    page,
  }) => {
    await page.addInitScript(
      installUpdaterMock({ kind: "available", version: "999.0.0" })
    );
    await openUpdatesAndCheck(page);

    await expect(
      page.getByRole("heading", { name: /installing update/i })
    ).toBeVisible();

    const relaunchCalled = await page.evaluate(
      () => (window as unknown as { __relaunchCalled?: boolean }).__relaunchCalled
    );
    expect(relaunchCalled).toBe(true);
  });

  test("shows feed-unavailable guidance", async ({ page }) => {
    await page.addInitScript(installUpdaterMock({ kind: "feed_missing" }));
    await openUpdatesAndCheck(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /update error/i })).toBeVisible();
    await expect(dialog.getByText(/no update feed is published/i)).toBeVisible();
  });

  test("shows ARM64 platform guidance", async ({ page }) => {
    await page.addInitScript(installUpdaterMock({ kind: "platform_missing" }));
    await openUpdatesAndCheck(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/windows on arm/i)).toBeVisible();
  });

  test("surfaces download/signature failures without relaunching", async ({
    page,
  }) => {
    await page.addInitScript(installUpdaterMock({ kind: "download_fail" }));
    await openUpdatesAndCheck(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /update error/i })).toBeVisible();
    await expect(dialog.getByText(/could not be verified/i)).toBeVisible();
    const relaunchCalled = await page.evaluate(
      () => (window as unknown as { __relaunchCalled?: boolean }).__relaunchCalled
    );
    expect(relaunchCalled).toBeFalsy();
  });

  test("logs update activity via Show logs", async ({ page }) => {
    await page.addInitScript(installUpdaterMock({ kind: "up_to_date" }));
    await openUpdatesAndCheck(page);
    await page.getByRole("heading", { name: /up to date/i }).waitFor();
    await page.getByRole("dialog").getByRole("button", { name: /close/i }).click();

    await page.evaluate(() => {
      window.__installMockHandler__?.("get_app_logs", async () => {
        throw new Error("use in-memory log buffer in test");
      });
    });

    await page.getByRole("button", { name: /show logs/i }).click();
    await expect(page.getByText(/update check started/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/update check: up to date/i).first()).toBeVisible();
  });
});
