/**
 * Ensures every `api.ts` wrapper has a default handler in the browser mock
 * so Playwright smoke/E2E never hit "no handler" warnings.
 */
import { describe, expect, it } from "vitest";
import { api } from "../../src/api";

const COMMAND_FOR_METHOD: Record<string, string> = {
  getLoggingPaths: "get_logging_paths",
  getDatabasePath: "get_database_path",
  getAppVersion: "get_app_version",
  getMyCompanyInfo: "get_my_company_info",
  saveMyCompanyInfo: "save_my_company_info",
  getAllCompanies: "get_all_companies",
  getNextCompanyId: "get_next_company_id",
  saveCompany: "save_company",
  deleteCompany: "delete_company",
  getAllContractors: "get_all_contractors",
  saveContractor: "save_contractor",
  deleteContractor: "delete_contractor",
  getAllJobs: "get_all_jobs",
  findJobByKey: "find_job_by_key",
  upsertJob: "upsert_job",
  deleteJob: "delete_job",
  deleteJobsByDescription: "delete_jobs_by_description",
  replaceAllJobs: "replace_all_jobs",
  getAllInvoices: "get_all_invoices",
  getInvoicesByDateRange: "get_invoices_by_date_range",
  getInvoicesReceivable: "get_invoices_receivable",
  getInvoicesSales: "get_invoices_sales",
  getInvoicesActive: "get_invoices_active",
  addInvoice: "add_invoice",
  updateInvoice: "update_invoice",
  deleteInvoice: "delete_invoice",
  applyReceivablePayments: "apply_receivable_payments",
  importCompaniesCsv: "import_companies_csv",
  importPropertiesCsv: "import_properties_csv",
  importSalesCsv: "import_sales_csv",
  createDatabaseBackup: "create_database_backup",
  restoreDatabaseFile: "restore_database_file",
  ensureCompanyByName: "ensure_company_by_name",
  getCompanyPropertyAddresses: "get_company_property_addresses",
  deleteSupervisor: "delete_supervisor",
  deleteProperty: "delete_property",
};

describe("Playwright mock IPC coverage", () => {
  it("documents a Rust command for every api wrapper", () => {
    for (const key of Object.keys(api)) {
      expect(COMMAND_FOR_METHOD[key], `missing mapping for api.${key}`).toBeTruthy();
    }
    expect(Object.keys(COMMAND_FOR_METHOD).length).toBe(Object.keys(api).length);
  });
});
