import { invokeLogged } from "./invokeLogged";
import type {
  Company,
  Contractor,
  CsvCompanyRow,
  CsvPropertyRow,
  CsvSalesRow,
  Invoice,
  JobDescription,
  LoggingPaths,
  MyCompanyInfo,
  OperationResult,
  PropertyAddressEntry,
  UpdateSettings,
} from "./types";

export const api = {
  getLoggingPaths: () => invokeLogged<LoggingPaths>("get_logging_paths"),
  getDatabasePath: () => invokeLogged<string>("get_database_path"),
  createDatabaseBackup: () => invokeLogged<number[]>("create_database_backup"),
  restoreDatabaseFile: (bytes: number[]) =>
    invokeLogged<void>("restore_database_file", { bytes }),

  getMyCompanyInfo: () => invokeLogged<MyCompanyInfo>("get_my_company_info"),
  saveMyCompanyInfo: (info: MyCompanyInfo) =>
    invokeLogged<OperationResult<MyCompanyInfo>>("save_my_company_info", { info }),

  getAllCompanies: () => invokeLogged<Company[]>("get_all_companies"),
  getNextCompanyId: () => invokeLogged<number>("get_next_company_id"),
  saveCompany: (company: Company) =>
    invokeLogged<OperationResult<Company>>("save_company", { company }),
  ensureCompanyByName: (name: string) =>
    invokeLogged<OperationResult<Company>>("ensure_company_by_name", { name }),
  deleteCompany: (companyId: number) =>
    invokeLogged<OperationResult<void>>("delete_company", { companyId }),
  deleteSupervisor: (id: number) =>
    invokeLogged<void>("delete_supervisor", { id }),
  deleteProperty: (id: number) => invokeLogged<void>("delete_property", { id }),
  getCompanyPropertyAddresses: (companyName: string) =>
    invokeLogged<PropertyAddressEntry[]>("get_company_property_addresses", {
      companyName,
    }),

  getAllContractors: () => invokeLogged<Contractor[]>("get_all_contractors"),
  saveContractor: (contractor: Contractor) =>
    invokeLogged<OperationResult<Contractor>>("save_contractor", { contractor }),
  deleteContractor: (id: number) =>
    invokeLogged<OperationResult<void>>("delete_contractor", { id }),

  getAllJobs: () => invokeLogged<JobDescription[]>("get_all_jobs"),
  replaceAllJobs: (jobs: JobDescription[]) =>
    invokeLogged<OperationResult<void>>("replace_all_jobs", { jobs }),
  findJobByKey: (
    description: string,
    sizeBedroom: number,
    sizeBathroom: number
  ) =>
    invokeLogged<JobDescription | null>("find_job_by_key", {
      description,
      sizeBedroom,
      sizeBathroom,
    }),
  upsertJob: (job: JobDescription) =>
    invokeLogged<OperationResult<JobDescription>>("upsert_job", { job }),
  deleteJob: (id: number) =>
    invokeLogged<OperationResult<void>>("delete_job", { id }),
  deleteJobsByDescription: (description: string) =>
    invokeLogged<OperationResult<number>>("delete_jobs_by_description", {
      description,
    }),

  getAllInvoices: () => invokeLogged<Invoice[]>("get_all_invoices"),
  getInvoicesByDateRange: (start: string, end: string) =>
    invokeLogged<Invoice[]>("get_invoices_by_date_range", { start, end }),
  getInvoicesReceivable: () => invokeLogged<Invoice[]>("get_invoices_receivable"),
  getInvoicesSales: () => invokeLogged<Invoice[]>("get_invoices_sales"),
  getInvoicesActive: () => invokeLogged<Invoice[]>("get_invoices_active"),
  addInvoice: (invoice: Invoice) =>
    invokeLogged<OperationResult<Invoice>>("add_invoice", { invoice }),
  updateInvoice: (invoice: Invoice) =>
    invokeLogged<OperationResult<Invoice>>("update_invoice", { invoice }),
  deleteInvoice: (id: number) =>
    invokeLogged<OperationResult<void>>("delete_invoice", { id }),
  applyReceivablePayments: (invoices: Invoice[]) =>
    invokeLogged<OperationResult<string>>("apply_receivable_payments", {
      invoices,
    }),

  importCompaniesCsv: (rows: CsvCompanyRow[]) =>
    invokeLogged<OperationResult<number>>("import_companies_csv", { rows }),
  importPropertiesCsv: (rows: CsvPropertyRow[]) =>
    invokeLogged<OperationResult<number>>("import_properties_csv", { rows }),
  importSalesCsv: (rows: CsvSalesRow[]) =>
    invokeLogged<OperationResult<number>>("import_sales_csv", { rows }),

  getAppVersion: () => invokeLogged<string>("get_app_version"),

  getUpdateConfig: () => invokeLogged<UpdateSettings>("get_update_config"),
  saveUpdateConfig: (cfg: UpdateSettings) =>
    invokeLogged<OperationResult<void>>("save_update_config", { cfg }),
};
