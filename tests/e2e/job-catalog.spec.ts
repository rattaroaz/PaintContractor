/**
 * End-to-end test of the Job Catalog page running against the real React build
 * + a mocked Tauri IPC layer (installed via VITE_TAURI_MOCK).
 */
import { expect, test } from "@playwright/test";

test.describe("Job Catalog", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __installMockHandler__?: (cmd: string, fn: (a: unknown) => unknown) => void;
      };
      const wait = setInterval(() => {
        if (w.__installMockHandler__) {
          w.__installMockHandler__("plugin:dialog|ask", async () => true);
          w.__installMockHandler__("plugin:dialog|confirm", async () => true);
          clearInterval(wait);
        }
      }, 25);
    });
  });

  test("shows one row per unique description and refreshes on Refresh", async ({ page }) => {
    await page.goto("/newjobs");
    await expect(page.getByRole("heading", { name: /new jobs/i })).toBeVisible();

    await expect(page.locator("input[value='Interior Paint']")).toHaveCount(1);
    await expect(page.locator("input[value='Trim Work']")).toHaveCount(1);

    await page.getByRole("button", { name: /refresh/i }).click();
    await expect(page.locator("input[value='Interior Paint']")).toHaveCount(1);
  });

  test("price changes when bedroom/bathroom toggle to a known combo", async ({ page }) => {
    await page.goto("/newjobs");
    const paintInput = page.locator("input[value='Interior Paint']").first();
    await expect(paintInput).toBeVisible();

    const row = paintInput.locator("xpath=ancestor::div[contains(@class,'row-existing-job')][1]");
    const numbers = row.locator("input[type='number']");

    await numbers.nth(0).fill("2");
    await numbers.nth(1).fill("2");

    await expect(numbers.nth(2)).toHaveValue("120", { timeout: 5_000 });
  });

  test("delete confirmation flows through the dialog plugin", async ({ page }) => {
    await page.goto("/newjobs");
    await expect(page.locator("input[value='Interior Paint']")).toHaveCount(1);

    let askPayload: unknown = null;
    await page.evaluate(() => {
      const w = window as unknown as {
        __installMockHandler__: (cmd: string, fn: (a: unknown) => unknown) => void;
        __delete_calls__: number;
      };
      w.__delete_calls__ = 0;
      w.__installMockHandler__("plugin:dialog|message", async (args) => {
        (w as unknown as { __ask__: unknown }).__ask__ = args;
        return "Yes";
      });
      w.__installMockHandler__("delete_jobs_by_description", async () => {
        w.__delete_calls__ += 1;
        return { success: true, message: "deleted", data: 1 };
      });
    });

    await page
      .locator("input[value='Interior Paint']")
      .locator("xpath=ancestor::div[contains(@class,'row-existing-job')][1]")
      .getByRole("button", { name: /delete/i })
      .click();

    await page.waitForTimeout(300);
    askPayload = await page.evaluate(
      () => (window as unknown as { __ask__: unknown }).__ask__
    );
    const deleteCalls = await page.evaluate(
      () => (window as unknown as { __delete_calls__: number }).__delete_calls__
    );

    expect(askPayload).toBeTruthy();
    expect(deleteCalls).toBe(1);
  });
});
