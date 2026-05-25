/**
 * Full IPC contract sweep: every wrapper in `src/api.ts` must call the
 * documented Rust command with the documented args. This protects against
 * accidental command renames / payload-shape drift, since it inspects the
 * actual handler-bound calls.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../../src/api";
import {
  getInvokeCallsFor,
  mockInvoke,
  resetInvokeMock,
} from "../helpers/tauri-mock";
import {
  makeCompany,
  makeContractor,
  makeInvoice,
  makeJob,
  makeMyCompanyInfo,
} from "../helpers/fixtures";

beforeEach(() => {
  resetInvokeMock();
});

function bind(cmd: string, value: unknown = null) {
  mockInvoke(cmd, async () => value);
}

describe("api contract — every wrapper exists and forwards the expected args", () => {
  it("getDatabasePath / createDatabaseBackup / restoreDatabaseFile", async () => {
    bind("get_database_path", "/tmp/db");
    bind("create_database_backup", [1, 2, 3]);
    bind("restore_database_file");
    await expect(api.getDatabasePath()).resolves.toBe("/tmp/db");
    await expect(api.createDatabaseBackup()).resolves.toEqual([1, 2, 3]);
    await api.restoreDatabaseFile([4, 5]);
    expect(getInvokeCallsFor("restore_database_file")).toEqual([{ bytes: [4, 5] }]);
  });

  it("my company info", async () => {
    bind("get_my_company_info", makeMyCompanyInfo());
    bind("save_my_company_info", { success: true, data: makeMyCompanyInfo() });
    await api.getMyCompanyInfo();
    const info = makeMyCompanyInfo({ name: "Z" });
    await api.saveMyCompanyInfo(info);
    expect(getInvokeCallsFor("save_my_company_info")).toEqual([{ info }]);
  });

  it("company commands", async () => {
    const company = makeCompany();
    bind("get_all_companies", [company]);
    bind("get_next_company_id", 1010);
    bind("save_company", { success: true, data: company });
    bind("ensure_company_by_name", { success: true, data: company });
    bind("delete_company", { success: true });
    bind("delete_supervisor");
    bind("delete_property");
    bind("get_company_property_addresses", []);

    await api.getAllCompanies();
    await api.getNextCompanyId();
    await api.saveCompany(company);
    await api.ensureCompanyByName("Acme");
    await api.deleteCompany(7);
    await api.deleteSupervisor(8);
    await api.deleteProperty(9);
    await api.getCompanyPropertyAddresses("Acme");

    expect(getInvokeCallsFor("save_company")).toEqual([{ company }]);
    expect(getInvokeCallsFor("ensure_company_by_name")).toEqual([{ name: "Acme" }]);
    expect(getInvokeCallsFor("delete_company")).toEqual([{ companyId: 7 }]);
    expect(getInvokeCallsFor("delete_supervisor")).toEqual([{ id: 8 }]);
    expect(getInvokeCallsFor("delete_property")).toEqual([{ id: 9 }]);
    expect(getInvokeCallsFor("get_company_property_addresses")).toEqual([
      { companyName: "Acme" },
    ]);
  });

  it("contractor commands", async () => {
    const c = makeContractor();
    bind("get_all_contractors", [c]);
    bind("save_contractor", { success: true, data: c });
    bind("delete_contractor", { success: true });
    await api.getAllContractors();
    await api.saveContractor(c);
    await api.deleteContractor(11);
    expect(getInvokeCallsFor("save_contractor")).toEqual([{ contractor: c }]);
    expect(getInvokeCallsFor("delete_contractor")).toEqual([{ id: 11 }]);
  });

  it("job commands", async () => {
    const job = makeJob();
    bind("get_all_jobs", [job]);
    bind("replace_all_jobs", { success: true });
    bind("find_job_by_key", job);
    bind("upsert_job", { success: true, data: job });
    bind("delete_job", { success: true });
    bind("delete_jobs_by_description", { success: true, data: 1 });
    await api.getAllJobs();
    await api.replaceAllJobs([job]);
    await api.findJobByKey("Paint", 2, 2);
    await api.upsertJob(job);
    await api.deleteJob(5);
    await api.deleteJobsByDescription("Paint");
    expect(getInvokeCallsFor("replace_all_jobs")).toEqual([{ jobs: [job] }]);
    expect(getInvokeCallsFor("find_job_by_key")).toEqual([
      { description: "Paint", sizeBedroom: 2, sizeBathroom: 2 },
    ]);
    expect(getInvokeCallsFor("upsert_job")).toEqual([{ job }]);
    expect(getInvokeCallsFor("delete_job")).toEqual([{ id: 5 }]);
    expect(getInvokeCallsFor("delete_jobs_by_description")).toEqual([
      { description: "Paint" },
    ]);
  });

  it("invoice commands", async () => {
    const inv = makeInvoice();
    bind("get_all_invoices", [inv]);
    bind("get_invoices_by_date_range", []);
    bind("get_invoices_receivable", []);
    bind("get_invoices_sales", []);
    bind("get_invoices_active", []);
    bind("add_invoice", { success: true, data: inv });
    bind("update_invoice", { success: true, data: inv });
    bind("delete_invoice", { success: true });
    bind("apply_receivable_payments", { success: true, data: "Updated 1." });

    await api.getAllInvoices();
    await api.getInvoicesByDateRange("2026-01-01", "2026-12-31");
    await api.getInvoicesReceivable();
    await api.getInvoicesSales();
    await api.getInvoicesActive();
    await api.addInvoice(inv);
    await api.updateInvoice(inv);
    await api.deleteInvoice(3);
    await api.applyReceivablePayments([inv]);

    expect(getInvokeCallsFor("get_invoices_by_date_range")).toEqual([
      { start: "2026-01-01", end: "2026-12-31" },
    ]);
    expect(getInvokeCallsFor("add_invoice")).toEqual([{ invoice: inv }]);
    expect(getInvokeCallsFor("update_invoice")).toEqual([{ invoice: inv }]);
    expect(getInvokeCallsFor("delete_invoice")).toEqual([{ id: 3 }]);
    expect(getInvokeCallsFor("apply_receivable_payments")).toEqual([
      { invoices: [inv] },
    ]);
  });

  it("CSV import commands", async () => {
    bind("import_companies_csv", { success: true, data: 0 });
    bind("import_properties_csv", { success: true, data: 0 });
    bind("import_sales_csv", { success: true, data: 0 });
    await api.importCompaniesCsv([]);
    await api.importPropertiesCsv([]);
    await api.importSalesCsv([]);
    expect(getInvokeCallsFor("import_companies_csv")).toEqual([{ rows: [] }]);
    expect(getInvokeCallsFor("import_properties_csv")).toEqual([{ rows: [] }]);
    expect(getInvokeCallsFor("import_sales_csv")).toEqual([{ rows: [] }]);
  });

  it("getAppVersion", async () => {
    bind("get_app_version", "1.0.0");
    await expect(api.getAppVersion()).resolves.toBe("1.0.0");
  });
});

describe("api propagates Rust failures", () => {
  it("rejects when invoke throws", async () => {
    mockInvoke("get_all_jobs", async () => {
      throw new Error("db down");
    });
    await expect(api.getAllJobs()).rejects.toThrow("db down");
  });

  it("returns OperationResult shape for failure responses", async () => {
    mockInvoke("save_company", async () => ({
      success: false,
      message: "duplicate",
    }));
    const res = await api.saveCompany(makeCompany());
    expect(res).toMatchObject({ success: false, message: "duplicate" });
  });
});
