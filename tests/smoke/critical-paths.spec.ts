/**
 * Smoke tests - the bare minimum to confirm the app boots, the IPC mock is
 * installed, and the main navigation works. These should run in <30s and
 * gate every commit.
 */
import { expect, test } from "@playwright/test";

test.describe("@smoke", () => {
  test("app boots and renders the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".main-layout, body")).toBeVisible();
    await expect(page).toHaveTitle(/Paint Contractor|DKSK|Vite/i);
  });

  test("mock IPC layer is installed (isTauri === true)", async ({ page }) => {
    await page.goto("/");
    // The install-tauri-mock module is loaded via a top-level dynamic import
    // in main.tsx, so wait for `window.isTauri` to flip rather than
    // sampling synchronously after navigation.
    await page.waitForFunction(
      () => Boolean((window as unknown as { isTauri?: boolean }).isTauri),
      { timeout: 5_000 }
    );
    const isTauri = await page.evaluate(() =>
      Boolean((window as unknown as { isTauri?: boolean }).isTauri)
    );
    expect(isTauri).toBe(true);
  });

  test("can navigate to the New Jobs catalog", async ({ page }) => {
    await page.goto("/newjobs");
    await expect(page.getByRole("heading", { name: /new jobs/i })).toBeVisible();
  });

  test("can navigate to Start Job", async ({ page }) => {
    await page.goto("/startjob");
    await expect(
      page.getByRole("heading", { name: /start (work order|a? ?job)/i })
    ).toBeVisible();
  });

  test("can navigate to Contacts", async ({ page }) => {
    await page.goto("/editviewcontacts");
    await expect(page.locator("body")).toBeVisible();
  });
});
