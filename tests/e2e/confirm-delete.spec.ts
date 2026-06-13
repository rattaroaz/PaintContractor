/**
 * E2E: destructive actions must honor the confirmation dialog.
 * Business logic is covered in tests/integration/edit-contacts.test.tsx;
 * this spec only verifies the Playwright mock + real router wiring.
 */
import { expect, test } from "@playwright/test";
import {
  expectEventually,
  installCompanyDeleteMocks,
} from "./helpers/ipc-mock";
import { companyPicker } from "./helpers/selectors";

const SEED_COMPANY = {
  id: 5,
  company_id: 1005,
  name: "Gamma LLC",
  owner: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  zip: null,
  special_note: null,
  supervisors: [],
};

async function selectGammaCompany(page: import("@playwright/test").Page) {
  const picker = companyPicker(page);
  await expect(picker).toBeVisible({ timeout: 10_000 });
  await picker.selectOption("Gamma LLC");
  await expect(page.getByRole("button", { name: /^delete company$/i })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("Confirm before delete", () => {
  test("company delete is blocked when user declines confirm", async ({ page }) => {
    await page.addInitScript(
      installCompanyDeleteMocks(SEED_COMPANY, "sequence")
    );
    await page.goto("/editviewcontacts");
    await selectGammaCompany(page);
    await page.getByRole("button", { name: /^delete company$/i }).click();

    await expectEventually(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __deleted?: boolean }).__deleted === true
        ),
      false
    );
  });

  test("company delete proceeds when user confirms", async ({ page }) => {
    await page.addInitScript(installCompanyDeleteMocks(SEED_COMPANY, "Yes"));
    await page.goto("/editviewcontacts");
    await selectGammaCompany(page);
    await page.getByRole("button", { name: /^delete company$/i }).click();

    await expectEventually(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __deleted?: boolean }).__deleted === true
        ),
      true
    );
  });
});
