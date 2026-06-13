/**
 * E2E: accounts receivable payment through the real router + mock IPC.
 * Backup, contacts tabs, and add-company flows are in tests/integration/pages.test.tsx.
 */
import { expect, test } from "@playwright/test";
import { expectEventually, INSTALL_DIALOG_HANDLERS_SCRIPT } from "./helpers/ipc-mock";

test.describe("Invoice lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(INSTALL_DIALOG_HANDLERS_SCRIPT);
    await page.addInitScript(() => {
      const w = window as unknown as {
        __mockStores__?: { invoices: unknown[] };
      };
      if (w.__mockStores__) w.__mockStores__.invoices = [];
    });
  });

  test("apply receivable payment marks an invoice fully paid", async ({ page }) => {
    await page.addInitScript(() => {
      const SEED = {
        id: 1,
        todays_date: "2026-05-25",
        work_date: "2026-05-20",
        company_name: "Acme Properties",
        property_address: "1 Main St",
        unit: "A",
        gate_code: null,
        lock_box: null,
        size_bedroom: 2,
        size_bathroom: 2,
        work_order: "WO-1",
        job_description_choice: '["Interior Paint"]',
        contractor_name: "Alex Painter",
        amount_cost: 200,
        amount_paid1: 0,
        date_paid1: null,
        check_number1: null,
        amount_paid2: 0,
        date_paid2: null,
        check_number2: null,
        invoice_created_date: "2026-05-25",
        special_note: null,
        garage_remote_code: null,
        status: 1,
      };
      const state = { invoice: { ...SEED } };
      (window as unknown as { __ar_state__: typeof state }).__ar_state__ = state;

      let real: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } | null =
        null;
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        configurable: true,
        set(v: { invoke: (cmd: string, args?: unknown) => Promise<unknown> }) {
          real = v;
          const wrapped = {
            ...v,
            invoke: async (cmd: string, args?: unknown) => {
              if (cmd === "get_invoices_receivable") {
                return state.invoice.amount_cost >
                  state.invoice.amount_paid1 + state.invoice.amount_paid2
                  ? [state.invoice]
                  : [];
              }
              if (cmd === "apply_receivable_payments") {
                const updates = (args as { invoices: Array<typeof SEED> }).invoices;
                const u = updates[0];
                if (u.amount_paid1 + u.amount_paid2 > u.amount_cost) {
                  return { success: false, message: "Overpaid" };
                }
                state.invoice = { ...state.invoice, ...u };
                return {
                  success: true,
                  message: "Updated 1 invoice(s). 1 fully paid.",
                  data: "Updated",
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

    await page.goto("/accountsreceivable");
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 7_000 });
    await expect(
      page.locator("table tbody tr").filter({ hasText: "Acme Properties" }).first()
    ).toBeVisible();

    const row = page
      .locator("table tbody tr")
      .filter({ hasText: "Acme Properties" })
      .first();
    await row.getByRole("checkbox").check();
    await row.getByRole("spinbutton").first().fill("200");
    await page.getByRole("button", { name: /^done$/i }).click();

    await expectEventually(
      () =>
        page.evaluate(
          () =>
            (window as unknown as {
              __ar_state__?: { invoice: { amount_paid1: number } };
            }).__ar_state__?.invoice?.amount_paid1 ?? 0
        ),
      200
    );
  });
});
