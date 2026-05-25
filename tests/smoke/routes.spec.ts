/**
 * Smoke matrix: every route in the app must mount without throwing,
 * render its title, and avoid crashing the ErrorBoundary.
 */
import { expect, test } from "@playwright/test";

const ROUTES: Array<{ path: string; titlePattern: RegExp }> = [
  { path: "/", titlePattern: /my company info/i },
  { path: "/startjob", titlePattern: /start (work order|a? ?job)/i },
  { path: "/activejobs", titlePattern: /active jobs/i },
  { path: "/createinvoice", titlePattern: /create invoice/i },
  { path: "/accountsreceivable", titlePattern: /accounts receivable/i },
  { path: "/agingreports", titlePattern: /aging/i },
  { path: "/sales", titlePattern: /sales/i },
  { path: "/payroll", titlePattern: /payroll/i },
  { path: "/contractorjobs", titlePattern: /contractor jobs/i },
  { path: "/editviewcontacts", titlePattern: /contacts/i },
  { path: "/newjobs", titlePattern: /new jobs|job catalog/i },
  { path: "/importexport", titlePattern: /import.*export/i },
  { path: "/addcontacts", titlePattern: /add (contacts|new)/i },
  { path: "/addcontacts/addcompany", titlePattern: /add.*company/i },
];

for (const { path, titlePattern } of ROUTES) {
  test(`route ${path} mounts without errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: titlePattern }).first()
    ).toBeVisible({ timeout: 7_000 });

    // No uncaught exceptions during initial render.
    const fatal = consoleErrors.filter(
      (msg) =>
        !msg.includes("React Router Future Flag") &&
        !msg.includes("[tauri-mock]") &&
        !msg.toLowerCase().includes("warning")
    );
    expect(fatal).toEqual([]);
  });
}
