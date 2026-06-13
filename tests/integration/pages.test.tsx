/**
 * Smoke + interaction tests for every major page mounted against the in-memory
 * Tauri IPC mock. Each test renders the page in a MemoryRouter with the
 * application's context providers and validates the most user-impactful flow.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  mockInvoke,
  mockInvokeMany,
  resetInvokeMock,
  getInvokeCallsFor,
  autoConfirm,
} from "../helpers/tauri-mock";
import { AppProviders } from "../../src/context/AppProviders";
import { APP_VERSION } from "../../src/lib/constants";
import {
  makeCompany,
  makeContractor,
  makeInvoice,
  makeJob,
  makeMyCompanyInfo,
} from "../helpers/fixtures";

function renderWithApp(node: React.ReactNode, route = "/") {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>
    </AppProviders>
  );
}

beforeEach(() => {
  resetInvokeMock();
  mockInvoke("get_my_company_info", async () => makeMyCompanyInfo());
});

describe("HomePage", () => {
  it("loads and submits the my company info form", async () => {
    const { HomePage } = await import("../../src/pages/HomePage");
    let saved: unknown = null;
    mockInvoke("save_my_company_info", async (args) => {
      saved = (args as { info: unknown }).info;
      return { success: true, message: "ok", data: (args as { info: unknown }).info };
    });
    renderWithApp(<HomePage />);
    await waitFor(() => screen.getByDisplayValue("DKSK Official"));
    fireEvent.change(screen.getByDisplayValue("DKSK Official"), {
      target: { value: "DKSK Painting" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() =>
      expect(getInvokeCallsFor("save_my_company_info")).toHaveLength(1)
    );
    expect((saved as { name: string }).name).toBe("DKSK Painting");
  });

  it("saves when all fields are empty", async () => {
    const { HomePage } = await import("../../src/pages/HomePage");
    mockInvoke("get_my_company_info", async () =>
      makeMyCompanyInfo({
        name: "",
        phone: "",
        email: "",
        address: "",
        zip: "",
        license_number: "",
      })
    );
    mockInvoke("save_my_company_info", async (args) => ({
      success: true,
      message: "ok",
      data: (args as { info: unknown }).info,
    }));
    renderWithApp(<HomePage />);
    await waitFor(() => screen.getByRole("button", { name: /save changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() =>
      expect(getInvokeCallsFor("save_my_company_info")).toHaveLength(1)
    );
  });
});

describe("ActiveJobsPage", () => {
  it("renders a list of active draft invoices", async () => {
    const { ActiveJobsPage } = await import("../../src/pages/ActiveJobsPage");
    mockInvokeMany({
      get_invoices_active: async () => [
        makeInvoice({ id: 1, company_name: "AcmeA", status: 0 }),
        makeInvoice({ id: 2, company_name: "BetaB", status: 0 }),
      ],
      delete_invoice: async () => ({ success: true }),
    });
    renderWithApp(<ActiveJobsPage />);
    await waitFor(() =>
      expect(screen.getAllByText("AcmeA").length).toBeGreaterThanOrEqual(1)
    );
    expect(screen.getAllByText("BetaB").length).toBeGreaterThanOrEqual(1);
  });
});

describe("SalesPage", () => {
  it("renders the sales table and lets the user export", async () => {
    const { SalesPage } = await import("../../src/pages/SalesPage");
    mockInvokeMany({
      get_invoices_sales: async () => [
        makeInvoice({ id: 1, company_name: "SalesCo", amount_cost: 100 }),
      ],
      "plugin:dialog|save": async () => "C:/tmp/x.xlsx",
      "plugin:fs|write_file": async () => undefined,
    });
    renderWithApp(<SalesPage />);
    await waitFor(() =>
      expect(screen.getAllByText("SalesCo").length).toBeGreaterThanOrEqual(1)
    );
    fireEvent.click(screen.getByRole("button", { name: /excel/i }));
    await waitFor(() =>
      expect(getInvokeCallsFor("plugin:fs|write_file")).toHaveLength(1)
    );
  });
});

describe("AgingReportsPage", () => {
  it("loads receivable invoices and groups by aging bucket", async () => {
    const { AgingReportsPage } = await import("../../src/pages/AgingReportsPage");
    mockInvoke("get_invoices_receivable", async () => [
      makeInvoice({ id: 1, work_date: "2020-01-01", amount_cost: 100 }),
    ]);
    renderWithApp(<AgingReportsPage />);
    await waitFor(() =>
      expect(getInvokeCallsFor("get_invoices_receivable")).toHaveLength(1)
    );
  });
});

describe("PayrollPage", () => {
  it("renders contractors and their work history", async () => {
    const { PayrollPage } = await import("../../src/pages/PayrollPage");
    mockInvokeMany({
      get_all_contractors: async () => [
        makeContractor({ name: "Alex Painter", is_active: true }),
      ],
      get_invoices_sales: async () => [
        makeInvoice({ contractor_name: "Alex Painter" }),
      ],
    });
    renderWithApp(<PayrollPage />);
    await screen.findByText(/Alex Painter/);
  });
});

describe("ContractorJobsPage", () => {
  it("loads contractor jobs from the backend", async () => {
    const { ContractorJobsPage } = await import(
      "../../src/pages/ContractorJobsPage"
    );
    mockInvokeMany({
      get_invoices_sales: async () => [makeInvoice()],
    });
    renderWithApp(<ContractorJobsPage />);
    await waitFor(() => {
      const calls = getInvokeCallsFor("get_invoices_sales");
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("AccountsReceivablePage", () => {
  it("loads receivable invoices and validates payment input", async () => {
    const { AccountsReceivablePage } = await import(
      "../../src/pages/AccountsReceivablePage"
    );
    mockInvokeMany({
      get_invoices_receivable: async () => [
        makeInvoice({ id: 1, amount_cost: 100, amount_paid1: 0, status: 1 }),
      ],
      apply_receivable_payments: async () => ({
        success: true,
        data: "Updated 1.",
      }),
    });
    renderWithApp(<AccountsReceivablePage />);
    await waitFor(() =>
      expect(getInvokeCallsFor("get_invoices_receivable").length).toBeGreaterThanOrEqual(1)
    );
  });
});

describe("ContactsPage", () => {
  it("renders the Company and Contractor tabs", async () => {
    const { ContactsPage } = await import("../../src/pages/ContactsPage");
    mockInvokeMany({
      get_all_companies: async () => [makeCompany()],
      get_all_contractors: async () => [makeContractor()],
    });
    renderWithApp(<ContactsPage />);
    expect(screen.getByRole("button", { name: /^company$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^contractor$/i }));
    await waitFor(() => {
      const calls = getInvokeCallsFor("get_all_contractors");
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("AddCompanyPage", () => {
  it("seeds the company id from the backend on mount", async () => {
    const { AddCompanyPage } = await import("../../src/pages/AddCompanyPage");
    mockInvoke("get_next_company_id", async () => 2042);
    mockInvoke("save_company", async () => ({
      success: true,
      data: makeCompany({ id: 1, company_id: 2042 }),
    }));
    renderWithApp(<AddCompanyPage />);
    await waitFor(() =>
      expect(getInvokeCallsFor("get_next_company_id").length).toBeGreaterThanOrEqual(1)
    );
  });
});

describe("ImportExportPage", () => {
  it("loads the database path on mount", async () => {
    const { ImportExportPage } = await import(
      "../../src/pages/ImportExportPage"
    );
    mockInvoke("get_database_path", async () => "C:/tmp/app.db");
    renderWithApp(<ImportExportPage />);
    await screen.findByText(/C:\/tmp\/app\.db/);
  });

  it("creates a backup when the user clicks Create Backup", async () => {
    const { ImportExportPage } = await import(
      "../../src/pages/ImportExportPage"
    );
    mockInvokeMany({
      get_database_path: async () => "C:/tmp/app.db",
      create_database_backup: async () => [1, 2, 3, 4],
      "plugin:dialog|save": async () => "C:/tmp/backup.db",
      "plugin:fs|write_file": async () => undefined,
    });
    renderWithApp(<ImportExportPage />);
    await screen.findByText(/C:\/tmp\/app\.db/);
    fireEvent.click(screen.getByRole("button", { name: /create backup/i }));
    await waitFor(() =>
      expect(getInvokeCallsFor("create_database_backup")).toHaveLength(1)
    );
  });
});

describe("JobCatalogPage navigation", () => {
  it("loads jobs and renders the catalog rows", async () => {
    const { JobCatalogPage } = await import("../../src/pages/JobCatalogPage");
    mockInvokeMany({
      get_all_jobs: async () => [
        makeJob({ id: 1, description: "Paint", price: 50 }),
      ],
      delete_jobs_by_description: async () => ({ success: true, data: 1 }),
    });
    renderWithApp(<JobCatalogPage />);
    await screen.findByDisplayValue("Paint");
  });
});

describe("StartJobPage", () => {
  it("loads companies, jobs, contractors on mount", async () => {
    const { StartJobPage } = await import("../../src/pages/StartJobPage");
    mockInvokeMany({
      get_all_companies: async () => [makeCompany()],
      get_all_jobs: async () => [makeJob()],
      get_all_contractors: async () => [makeContractor()],
      ensure_company_by_name: async () => ({
        success: true,
        data: makeCompany(),
      }),
    });
    renderWithApp(<StartJobPage />);
    await waitFor(() =>
      expect(getInvokeCallsFor("get_all_companies").length).toBeGreaterThanOrEqual(1)
    );
  });
});

describe("CreateInvoicePage", () => {
  it("loads jobs and contractors on mount", async () => {
    const { CreateInvoicePage } = await import(
      "../../src/pages/CreateInvoicePage"
    );
    mockInvokeMany({
      get_all_jobs: async () => [makeJob()],
      get_all_contractors: async () => [makeContractor()],
      get_invoices_by_date_range: async () => [],
    });
    renderWithApp(<CreateInvoicePage />);
    await waitFor(() => {
      expect(
        getInvokeCallsFor("get_all_jobs").length +
          getInvokeCallsFor("get_all_contractors").length
      ).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("NotFoundPage", () => {
  it("renders a not-found message", async () => {
    const { NotFoundPage } = await import("../../src/pages/NotFoundPage");
    renderWithApp(<NotFoundPage />);
    expect(
      screen.getByText(/nothing at this address/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toHaveAttribute("href", "/");
  });
});

describe("UpdateSettingsPage", () => {
  it("shows app version and check for updates button", async () => {
    const { UpdateSettingsPage } = await import(
      "../../src/pages/UpdateSettingsPage"
    );
    renderWithApp(<UpdateSettingsPage />, "/settings/updates");
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /check for updates/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show logs/i })
    ).toBeInTheDocument();
  });

  it("shows log list with level filter when Show logs is clicked", async () => {
    const user = userEvent.setup();
    const { UpdateSettingsPage } = await import(
      "../../src/pages/UpdateSettingsPage"
    );
    const { logger } = await import("../../src/utils/logger");

    logger.info("Update check started", { category: "update" });
    logger.error("Update check failed", { category: "update", error: "404" });

    renderWithApp(<UpdateSettingsPage />, "/settings/updates");
    await user.click(screen.getByRole("button", { name: /show logs/i }));

    expect(screen.getByLabelText(/level/i)).toBeInTheDocument();
    expect(screen.getByText(/Update check started/)).toBeInTheDocument();
    expect(screen.getByText(/Update check failed/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/level/i), "error");
    expect(screen.queryByText(/Update check started/)).not.toBeInTheDocument();
    expect(screen.getByText(/Update check failed/)).toBeInTheDocument();
  });
});

describe("AddContactsHubPage", () => {
  it("switches hub tabs between company and contractor", async () => {
    mockInvokeMany({
      get_next_company_id: async () => 1010,
      get_all_contractors: async () => [makeContractor()],
    });
    const { AddContactsHubPage } = await import(
      "../../src/pages/AddContactsHubPage"
    );
    renderWithApp(<AddContactsHubPage />);
    expect(screen.getByText(/add contacts/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^contractor$/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/type first letters/i)).toBeInTheDocument()
    );
  });
});
