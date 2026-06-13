/**
 * End-to-end smoke for the Job Catalog page.
 * Price/debounce/delete logic lives in tests/integration/job-catalog-flow.test.tsx.
 */
import { expect, test } from "@playwright/test";
import { INSTALL_DIALOG_HANDLERS_SCRIPT } from "./helpers/ipc-mock";
import { jobCatalogRow } from "./helpers/selectors";

test.describe("Job Catalog", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(INSTALL_DIALOG_HANDLERS_SCRIPT);
  });

  test("shows one row per unique description and refreshes on Refresh", async ({
    page,
  }) => {
    await page.goto("/newjobs");
    await expect(page.getByRole("heading", { name: /new jobs/i })).toBeVisible();

    await expect(jobCatalogRow(page, "Interior Paint")).toHaveCount(1);
    await expect(jobCatalogRow(page, "Trim Work")).toHaveCount(1);

    await page.getByRole("button", { name: /refresh/i }).click();
    await expect(jobCatalogRow(page, "Interior Paint")).toHaveCount(1);
  });
});
