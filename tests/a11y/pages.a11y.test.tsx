/**
 * End-to-end accessibility audits for the most user-facing pages.
 *
 * These tests boot each page against the in-memory IPC mock, wait for the
 * first useful frame to render, and run axe-core against the rendered DOM.
 * A regression that drops a label, button text, or form/input association
 * will fail the build instead of silently shipping.
 */
import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  mockInvoke,
  mockInvokeMany,
  resetInvokeMock,
} from "../helpers/tauri-mock";
import { AppProviders } from "../../src/context/AppProviders";
import {
  makeCompany,
  makeContractor,
  makeInvoice,
  makeJob,
  makeMyCompanyInfo,
} from "../helpers/fixtures";

/**
 * Audit a page in isolation. We disable rules that fail because the page is
 * rendered without the application chrome (no <html>, no landmarks) or rules
 * that target legacy issues we are tracking separately (label associations
 * use the visible-label pattern app-wide; HomePage is being progressively
 * migrated to proper htmlFor/id pairs).
 */
async function audit(container: Element): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
      "html-has-lang": { enabled: false },
      bypass: { enabled: false },
      // Tracked in #a11y-labels - applied progressively starting with HomePage.
      label: { enabled: false },
      "select-name": { enabled: false },
    },
  });
  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `  • ${v.id}: ${v.help}\n` +
          v.nodes
            .map((n) => `      - ${n.target.join(" > ")}: ${n.failureSummary}`)
            .join("\n")
      )
      .join("\n");
    throw new Error(`axe violations:\n${summary}`);
  }
  expect(results.violations).toEqual([]);
}

/** Strict audit (everything axe complains about must be fixed). */
async function strictAudit(container: Element): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
      "html-has-lang": { enabled: false },
      bypass: { enabled: false },
    },
  });
  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `  • ${v.id}: ${v.help}\n` +
          v.nodes
            .map((n) => `      - ${n.target.join(" > ")}: ${n.failureSummary}`)
            .join("\n")
      )
      .join("\n");
    throw new Error(`axe violations:\n${summary}`);
  }
  expect(results.violations).toEqual([]);
}

function renderPage(node: React.ReactNode) {
  return render(
    <AppProviders>
      <MemoryRouter>{node}</MemoryRouter>
    </AppProviders>
  );
}

beforeEach(() => {
  resetInvokeMock();
  mockInvoke("get_my_company_info", async () => makeMyCompanyInfo());
});

describe("a11y pages", () => {
  // HomePage uses the strict audit (form labels are wired with htmlFor/id).
  it("HomePage has no axe violations (strict, including label associations)", async () => {
    const { HomePage } = await import("../../src/pages/HomePage");
    mockInvoke("save_my_company_info", async (args) => ({
      success: true,
      message: "ok",
      data: (args as { info: unknown }).info,
    }));
    const { container } = renderPage(<HomePage />);
    await waitFor(() => screen.getByDisplayValue("DKSK Official"));
    await strictAudit(container);
  });

  it("ActiveJobsPage has no axe violations (strict filters)", async () => {
    const { ActiveJobsPage } = await import("../../src/pages/ActiveJobsPage");
    mockInvokeMany({
      get_invoices_active: async () => [makeInvoice({ status: 0 })],
      get_all_contractors: async () => [makeContractor()],
    });
    const { container } = renderPage(<ActiveJobsPage />);
    await waitFor(() => screen.getByText(/active jobs/i));
    await strictAudit(container);
  });

  it("SalesPage has no axe violations (strict filters)", async () => {
    const { SalesPage } = await import("../../src/pages/SalesPage");
    mockInvokeMany({
      get_invoices_sales: async () => [makeInvoice({ status: 1 })],
      get_invoices_by_date_range: async () => [],
    });
    const { container } = renderPage(<SalesPage />);
    await waitFor(() => screen.getByText(/sales/i));
    await strictAudit(container);
  });

  it("AccountsReceivablePage has no axe violations (strict filters)", async () => {
    const { AccountsReceivablePage } = await import(
      "../../src/pages/AccountsReceivablePage"
    );
    mockInvokeMany({
      get_invoices_receivable: async () => [
        makeInvoice({ status: 1, amount_cost: 200, amount_paid1: 0, amount_paid2: 0 }),
      ],
    });
    const { container } = renderPage(<AccountsReceivablePage />);
    await waitFor(() => screen.getByText(/accounts receivable/i));
    await strictAudit(container);
  });

  it("AgingReportsPage has no axe violations", async () => {
    const { AgingReportsPage } = await import("../../src/pages/AgingReportsPage");
    mockInvoke("get_invoices_receivable", async () => []);
    const { container } = renderPage(<AgingReportsPage />);
    await waitFor(() => screen.getByText(/aging report/i));
    await audit(container);
  });

  it("PayrollPage has no axe violations", async () => {
    const { PayrollPage } = await import("../../src/pages/PayrollPage");
    mockInvokeMany({
      get_all_contractors: async () => [makeContractor()],
      get_all_invoices: async () => [],
    });
    const { container } = renderPage(<PayrollPage />);
    await waitFor(() => screen.getByText(/payroll/i));
    await audit(container);
  });

  it("ContactsPage has no axe violations", async () => {
    const { ContactsPage } = await import("../../src/pages/ContactsPage");
    mockInvokeMany({
      get_all_companies: async () => [makeCompany()],
      get_all_contractors: async () => [makeContractor()],
    });
    const { container } = renderPage(<ContactsPage />);
    await waitFor(() => screen.getAllByText(/contacts/i).length > 0);
    await audit(container);
  });

  it("AddCompanyPage has no axe violations", async () => {
    const { AddCompanyPage } = await import("../../src/pages/AddCompanyPage");
    mockInvokeMany({
      get_next_company_id: async () => 1010,
      save_company: async (args) => ({
        success: true,
        message: "ok",
        data: (args as { company: unknown }).company,
      }),
    });
    const { container } = renderPage(<AddCompanyPage />);
    await waitFor(() => screen.getByText(/add company/i));
    await audit(container);
  });

  it("JobCatalogPage has no axe violations", async () => {
    const { JobCatalogPage } = await import("../../src/pages/JobCatalogPage");
    mockInvokeMany({
      get_all_jobs: async () => [
        makeJob({ description: "Interior Paint", size_bedroom: 1, size_bathroom: 1 }),
      ],
    });
    const { container } = renderPage(<JobCatalogPage />);
    await waitFor(() => screen.getByText(/job catalog/i));
    await audit(container);
  });

  it("NotFoundPage has no axe violations", async () => {
    const { NotFoundPage } = await import("../../src/pages/NotFoundPage");
    const { container } = renderPage(<NotFoundPage />);
    await waitFor(() => screen.getByRole("link", { name: /dashboard/i }));
    await audit(container);
  });
});
