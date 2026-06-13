/**
 * E2E for the Start Job flow. Verifies the page loads with seeded mock data.
 * Form field wiring is covered in tests/integration/pages.test.tsx.
 */
import { expect, test } from "@playwright/test";
import { startJobCompanySelect } from "./helpers/selectors";

test.describe("Start Job", () => {
  test("loads the form and the company picker is available", async ({ page }) => {
    await page.goto("/startjob");
    await expect(
      page.getByRole("heading", { name: /start (work order|a? ?job)/i })
    ).toBeVisible();

    const companySelect = startJobCompanySelect(page);
    await expect(companySelect).toBeVisible({ timeout: 5_000 });
    await expect(companySelect).toHaveRole("combobox");
  });

  test("required form labels are present", async ({ page }) => {
    await page.goto("/startjob");
    await expect(page.getByText(/work date/i).first()).toBeVisible();
    await expect(page.getByLabel(/property address/i)).toBeVisible();
    await expect(page.getByText(/bedrooms/i).first()).toBeVisible();
    await expect(page.getByText(/bathrooms/i).first()).toBeVisible();
  });
});
