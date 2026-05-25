/**
 * E2E: destructive actions must honor the confirmation dialog.
 * Hijacks invoke before the app loads so company data and dialog answers are deterministic.
 */
import { expect, test } from "@playwright/test";

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

function installCompanyDeleteMocks(dialogAnswer: "No" | "Yes" | "sequence") {
  return `
    (() => {
      const SEED = ${JSON.stringify(SEED_COMPANY)};
      let dialogCalls = 0;
      let real = null;
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        configurable: true,
        set(v) {
          real = v;
          const wrapped = {
            ...v,
            invoke: async (cmd, args) => {
              if (cmd === "get_all_companies") return [SEED];
              if (cmd === "get_next_company_id") return 1006;
              if (cmd === "delete_company") {
                window.__deleted = true;
                return { success: true, message: "ok" };
              }
              if (cmd === "plugin:dialog|message") {
                if ("${dialogAnswer}" === "sequence") {
                  dialogCalls++;
                  return dialogCalls === 1 ? "No" : "Yes";
                }
                return "${dialogAnswer}";
              }
              return real.invoke(cmd, args);
            },
          };
          Object.defineProperty(window, "__TAURI_INTERNALS__", {
            value: wrapped,
            configurable: true,
            writable: true,
          });
        },
      });
    })();
  `;
}

async function selectGammaCompany(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "▾" }).click();
  await page.getByRole("button", { name: "Gamma LLC", exact: true }).click();
  await expect(page.getByRole("button", { name: /^delete company$/i })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("Confirm before delete", () => {
  test("company delete is blocked when user declines confirm", async ({ page }) => {
    await page.addInitScript(installCompanyDeleteMocks("sequence"));
    await page.goto("/editviewcontacts");
    await selectGammaCompany(page);
    await page.getByRole("button", { name: /^delete company$/i }).click();
    await page.waitForTimeout(400);

    const deleted = await page.evaluate(
      () => (window as unknown as { __deleted?: boolean }).__deleted === true
    );
    expect(deleted).toBe(false);
  });

  test("company delete proceeds when user confirms", async ({ page }) => {
    await page.addInitScript(installCompanyDeleteMocks("Yes"));
    await page.goto("/editviewcontacts");
    await selectGammaCompany(page);
    await page.getByRole("button", { name: /^delete company$/i }).click();
    await page.waitForTimeout(400);

    const deleted = await page.evaluate(
      () => (window as unknown as { __deleted?: boolean }).__deleted === true
    );
    expect(deleted).toBe(true);
  });
});
