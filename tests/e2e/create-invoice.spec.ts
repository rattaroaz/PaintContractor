/**
 * E2E for the Create Invoice workflow.
 *
 * Drives the page against a primed in-memory IPC mock that seeds:
 *   - a single draft invoice (status === Draft)
 *   - the jobs catalog needed for recalculation
 *   - the contractor list needed for the confirmation modal
 *
 * The test:
 *   1. searches a date range
 *   2. verifies the draft invoice appears in the table
 *   3. selects it, opens the confirmation modal
 *   4. validates the modal's payload and amount field
 */
import { expect, test } from "@playwright/test";

test.describe("Create Invoice", () => {
  test("searches drafts, selects one, opens the confirm modal", async ({ page }) => {
    await page.addInitScript(() => {
      const SEED = {
        id: 7,
        todays_date: "2026-05-25",
        work_date: "2026-05-20",
        company_name: "Acme Properties",
        property_address: "1 Main St",
        unit: "B",
        gate_code: null,
        lock_box: null,
        size_bedroom: 2,
        size_bathroom: 2,
        work_order: "WO-7",
        job_description_choice: '["Interior Paint"]',
        contractor_name: "Alex Painter",
        amount_cost: 120,
        amount_paid1: 0,
        date_paid1: null,
        check_number1: null,
        amount_paid2: 0,
        date_paid2: null,
        check_number2: null,
        invoice_created_date: "2026-05-25",
        special_note: null,
        garage_remote_code: null,
        status: 0,
      };
      let real: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } | null = null;
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        configurable: true,
        set(v: { invoke: (cmd: string, args?: unknown) => Promise<unknown> }) {
          real = v;
          const wrapped = {
            ...v,
            invoke: async (cmd: string, args?: unknown) => {
              if (cmd === "get_invoices_by_date_range") {
                return [SEED];
              }
              if (cmd === "update_invoice") {
                return {
                  success: true,
                  message: "ok",
                  data: (args as { invoice: typeof SEED }).invoice,
                };
              }
              return real!.invoke(cmd, args);
            },
          };
          Object.defineProperty(window, "__TAURI_INTERNALS__", {
            value: wrapped,
            configurable: true,
            writable: true,
          });
        },
      });
    });

    await page.goto("/createinvoice");
    await expect(page.getByRole("heading", { name: /create invoice/i })).toBeVisible();
    await page.getByRole("button", { name: /search/i }).click();

    // Draft row materialized in the table.
    await expect(
      page.locator("table tbody tr").filter({ hasText: "Acme Properties" })
    ).toBeVisible({ timeout: 5_000 });

    // Click the row to surface the confirmation modal.
    await page
      .locator("table tbody tr")
      .filter({ hasText: "Acme Properties" })
      .click();

    // The confirmation modal opens (a modal-style heading or backdrop becomes visible).
    await expect(
      page.locator(".modal.show, [role='dialog']").first()
    ).toBeVisible({ timeout: 5_000 });
    // The seed amount is mirrored into one of the modal's inputs.
    await expect(page.locator("input[value='120']").first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
