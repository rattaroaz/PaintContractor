/**
 * E2E for the Start Job flow. Verifies the page loads and surfaces seeded
 * mock data (companies, contractors, jobs) so the user can author a work
 * order without a real Tauri runtime.
 */
import { expect, test } from "@playwright/test";

test.describe("Start Job", () => {
  test("loads the form and the seeded company appears in the datalist", async ({ page }) => {
    await page.goto("/startjob");
    await expect(
      page.getByRole("heading", { name: /start (work order|a? ?job)/i })
    ).toBeVisible();

    const acmeOption = page.locator(
      "datalist option[value='Acme Properties'], option:has-text('Acme Properties')"
    );
    await expect(acmeOption.first()).toHaveCount(1, { timeout: 5_000 });
  });

  test("required form labels are present", async ({ page }) => {
    await page.goto("/startjob");
    await expect(page.getByText(/work date/i).first()).toBeVisible();
    await expect(page.getByText(/property address/i).first()).toBeVisible();
    await expect(page.getByText(/bedrooms/i).first()).toBeVisible();
    await expect(page.getByText(/bathrooms/i).first()).toBeVisible();
  });
});
