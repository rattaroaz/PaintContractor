/**
 * Integration tests for the typed `api` wrapper. They go through the real
 * `@tauri-apps/api/core#invoke` path but route the IPC layer through the
 * mock harness, so we can verify:
 *   - Every wrapper invokes the correct Rust command name
 *   - Argument shapes are correct (snake/camelCase + payload nesting)
 *   - Return values are passed through to the caller unchanged
 */
import { describe, expect, it } from "vitest";
import { api } from "../../src/api";
import { errResult, getInvokeCallsFor, mockInvoke, okResult } from "../helpers/tauri-mock";
import { makeCompany, makeContractor, makeInvoice, makeJob } from "../helpers/fixtures";

describe("api wrapper command routing", () => {
  it("getDatabasePath -> get_database_path", async () => {
    mockInvoke("get_database_path", async () => "C:/tmp/app.db");
    const path = await api.getDatabasePath();
    expect(path).toBe("C:/tmp/app.db");
    expect(getInvokeCallsFor("get_database_path")).toEqual([{}]);
  });

  it("saveCompany passes the company object verbatim", async () => {
    const company = makeCompany();
    mockInvoke("save_company", async (args) => {
      expect(args).toEqual({ company });
      return okResult(company);
    });
    const res = await api.saveCompany(company);
    expect(res.success).toBe(true);
    expect(res.data?.name).toBe(company.name);
  });

  it("deleteCompany sends the camelCase companyId argument", async () => {
    mockInvoke("delete_company", async (args) => {
      expect(args).toEqual({ companyId: 1001 });
      return okResult(undefined);
    });
    await api.deleteCompany(1001);
  });

  it("findJobByKey forwards the composite key tuple", async () => {
    mockInvoke("find_job_by_key", async (args) => {
      expect(args).toEqual({ description: "Paint", sizeBedroom: 2, sizeBathroom: 2 });
      return makeJob({ description: "Paint", size_bedroom: 2, size_bathroom: 2, price: 100 });
    });
    const job = await api.findJobByKey("Paint", 2, 2);
    expect(job?.price).toBe(100);
  });

  it("upsertJob round-trips an OperationResult", async () => {
    mockInvoke("upsert_job", async () => okResult(makeJob({ id: 99 })));
    const res = await api.upsertJob(makeJob());
    expect(res.data?.id).toBe(99);
  });

  it("deleteJobsByDescription returns the number of rows removed", async () => {
    mockInvoke("delete_jobs_by_description", async () => okResult(3, "Removed 3 entries"));
    const res = await api.deleteJobsByDescription("Paint");
    expect(res.success).toBe(true);
    expect(res.data).toBe(3);
  });

  it("addInvoice / updateInvoice / deleteInvoice all route correctly", async () => {
    const inv = makeInvoice();
    mockInvoke("add_invoice", async (args) => {
      expect((args as { invoice: unknown }).invoice).toEqual(inv);
      return okResult(inv);
    });
    mockInvoke("update_invoice", async () => okResult(inv));
    mockInvoke("delete_invoice", async (args) => {
      expect(args).toEqual({ id: 7 });
      return okResult(undefined);
    });

    await api.addInvoice(inv);
    await api.updateInvoice(inv);
    await api.deleteInvoice(7);
  });

  it("saveContractor surfaces backend failure messages", async () => {
    mockInvoke("save_contractor", async () => errResult("Name already exists"));
    const res = await api.saveContractor(makeContractor());
    expect(res.success).toBe(false);
    expect(res.message).toBe("Name already exists");
  });
});
