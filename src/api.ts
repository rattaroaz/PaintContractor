import { invoke } from "@tauri-apps/api/core";
import type {
  Company,
  Contractor,
  CsvCompanyRow,
  CsvPropertyRow,
  CsvSalesRow,
  Invoice,
  JobDescription,
  MyCompanyInfo,
  OperationResult,
  PropertyAddressEntry,
} from "./types";

export const api = {
  getDatabasePath: () => invoke<string>("get_database_path"),
  createDatabaseBackup: () => invoke<number[]>("create_database_backup"),
  restoreDatabaseFile: (bytes: number[]) =>
    invoke<void>("restore_database_file", { bytes }),

  getMyCompanyInfo: () => invoke<MyCompanyInfo>("get_my_company_info"),
  saveMyCompanyInfo: (info: MyCompanyInfo) =>
    invoke<OperationResult<MyCompanyInfo>>("save_my_company_info", { info }),

  getAllCompanies: () => invoke<Company[]>("get_all_companies"),
  getNextCompanyId: () => invoke<number>("get_next_company_id"),
  saveCompany: (company: Company) =>
    invoke<OperationResult<Company>>("save_company", { company }),
  ensureCompanyByName: (name: string) =>
    invoke<OperationResult<Company>>("ensure_company_by_name", { name }),
  deleteCompany: (companyId: number) =>
    invoke<OperationResult<void>>("delete_company", { companyId }),
  deleteSupervisor: (id: number) => invoke<void>("delete_supervisor", { id }),
  deleteProperty: (id: number) => invoke<void>("delete_property", { id }),
  getCompanyPropertyAddresses: (companyName: string) =>
    invoke<PropertyAddressEntry[]>("get_company_property_addresses", {
      companyName,
    }),

  getAllContractors: () => invoke<Contractor[]>("get_all_contractors"),
  saveContractor: (contractor: Contractor) =>
    invoke<OperationResult<Contractor>>("save_contractor", { contractor }),
  deleteContractor: (id: number) =>
    invoke<OperationResult<void>>("delete_contractor", { id }),

  getAllJobs: () => invoke<JobDescription[]>("get_all_jobs"),
  replaceAllJobs: (jobs: JobDescription[]) =>
    invoke<OperationResult<void>>("replace_all_jobs", { jobs }),
  findJobByKey: (
    description: string,
    sizeBedroom: number,
    sizeBathroom: number
  ) =>
    invoke<JobDescription | null>("find_job_by_key", {
      description,
      sizeBedroom,
      sizeBathroom,
    }),
  upsertJob: (job: JobDescription) =>
    invoke<OperationResult<JobDescription>>("upsert_job", { job }),
  deleteJob: (id: number) =>
    invoke<OperationResult<void>>("delete_job", { id }),
  deleteJobsByDescription: (description: string) =>
    invoke<OperationResult<number>>("delete_jobs_by_description", {
      description,
    }),

  getAllInvoices: () => invoke<Invoice[]>("get_all_invoices"),
  getInvoicesByDateRange: (start: string, end: string) =>
    invoke<Invoice[]>("get_invoices_by_date_range", { start, end }),
  getInvoicesReceivable: () => invoke<Invoice[]>("get_invoices_receivable"),
  getInvoicesSales: () => invoke<Invoice[]>("get_invoices_sales"),
  getInvoicesActive: () => invoke<Invoice[]>("get_invoices_active"),
  addInvoice: (invoice: Invoice) =>
    invoke<OperationResult<Invoice>>("add_invoice", { invoice }),
  updateInvoice: (invoice: Invoice) =>
    invoke<OperationResult<Invoice>>("update_invoice", { invoice }),
  deleteInvoice: (id: number) =>
    invoke<OperationResult<void>>("delete_invoice", { id }),
  applyReceivablePayments: (invoices: Invoice[]) =>
    invoke<OperationResult<string>>("apply_receivable_payments", { invoices }),

  importCompaniesCsv: (rows: CsvCompanyRow[]) =>
    invoke<OperationResult<number>>("import_companies_csv", { rows }),
  importPropertiesCsv: (rows: CsvPropertyRow[]) =>
    invoke<OperationResult<number>>("import_properties_csv", { rows }),
  importSalesCsv: (rows: CsvSalesRow[]) =>
    invoke<OperationResult<number>>("import_sales_csv", { rows }),

  getAppVersion: () => invoke<string>("get_app_version"),
};
