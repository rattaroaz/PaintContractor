import type { Locator, Page } from "@playwright/test";

/**
 * User-facing locators for Playwright E2E.
 * Prefer roles and labels over ids, classes, or DOM structure.
 */
export function companyPicker(page: Page): Locator {
  return page.getByLabel(/^company$/i);
}

export function contractorPicker(page: Page): Locator {
  return page.getByLabel(/^contractor$/i);
}

export function startJobCompanySelect(page: Page): Locator {
  return page.getByLabel(/company name/i);
}

export function jobCatalogRow(page: Page, description: string): Locator {
  return page.locator(
    `[data-testid="job-catalog-row"][data-job-description="${description}"]`
  );
}
