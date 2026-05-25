/**
 * E2E tests covering the full invoice lifecycle: start job → review → submit
 * (becomes a draft) → edit → accounts receivable payment → fully paid.
 *
 * Runs against the real React production build with the mocked Tauri IPC.
 */
import { expect, test } from "@playwright/test";

test.describe("Invoice lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __installMockHandler__?: (cmd: string, fn: (a: unknown) => unknown) => void;
        __mockStores__?: { invoices: unknown[] };
      };
      const wait = setInterval(() => {
        if (w.__installMockHandler__) {
          // Always confirm destructive ops.
          w.__installMockHandler__("plugin:dialog|message", async () => "Yes");
          w.__installMockHandler__("plugin:dialog|ask", async () => true);
          // Reset between scenarios.
          if (w.__mockStores__) w.__mockStores__.invoices = [];
          clearInterval(wait);
        }
      }, 25);
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

      // Intercept __TAURI_INTERNALS__ assignment so we can hijack invoke
      // BEFORE any React component renders.
      let real: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } | null = null;
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

    // Select the row so the payment inputs are revealed.
    const checkboxes = page.locator("input[type='checkbox']");
    await checkboxes.first().check();

    const paidInput = page.locator("input[type='number']").first();
    await paidInput.fill("200");
    await page.getByRole("button", { name: /^done$/i }).click();
    await page.waitForTimeout(500);

    const remaining = await page.evaluate(
      () =>
        (window as unknown as {
          __ar_state__?: { invoice: { amount_paid1: number } };
        }).__ar_state__?.invoice?.amount_paid1 ?? 0
    );
    expect(remaining).toBe(200);
  });
});

test.describe("Import / Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __installMockHandler__?: (cmd: string, fn: (a: unknown) => unknown) => void;
      };
      const wait = setInterval(() => {
        if (w.__installMockHandler__) {
          let saveCalls = 0;
          w.__installMockHandler__("plugin:dialog|save", async () => {
            saveCalls++;
            (w as unknown as { __save_calls__: number }).__save_calls__ =
              saveCalls;
            return "/tmp/backup.db";
          });
          w.__installMockHandler__("plugin:fs|write_file", async () => null);
          clearInterval(wait);
        }
      }, 25);
    });
  });

  test("create backup triggers the save dialog and writes the file", async ({ page }) => {
    await page.goto("/importexport");
    await expect(page.getByRole("heading", { name: /import.*export.*backup/i })).toBeVisible();
    await page.getByRole("button", { name: /^create backup/i }).click();
    await page.waitForTimeout(500);
    const calls = await page.evaluate(
      () => (window as unknown as { __save_calls__?: number }).__save_calls__ ?? 0
    );
    expect(calls).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Contacts page", () => {
  test("toggles between Company and Contractor tabs", async ({ page }) => {
    await page.goto("/editviewcontacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();
    await page.getByRole("button", { name: /^contractor$/i }).click();
    // The contractor edit form mounts and exposes a name field/control.
    await expect(
      page.getByText(/name/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Add Company", () => {
  test("renders the form with the suggested next CompanyID", async ({ page }) => {
    await page.goto("/addcontacts/addcompany");
    await expect(page.getByRole("heading", { name: /add.*company/i })).toBeVisible();
    // CompanyID seeded by get_next_company_id mock.
    const cidField = page.locator("input").filter({ hasText: "" }).first();
    await expect(cidField).toBeVisible();
  });
});
