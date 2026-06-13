/**
 * Smoke matrix: every route in the app must mount without throwing,
 * render its title, and avoid crashing the ErrorBoundary.
 */
import { expect, test } from "@playwright/test";
import { SMOKE_ROUTES } from "../../src/routeMetadata";

for (const { path, titlePattern } of SMOKE_ROUTES) {
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
