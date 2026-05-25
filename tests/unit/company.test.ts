import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetInvokeMock } from "../helpers/tauri-mock";
import { emptyCompanyForm, fetchNextCompanyId } from "../../src/utils/company";

beforeEach(() => {
  resetInvokeMock();
});

describe("fetchNextCompanyId", () => {
  it("returns the value from the Tauri command on success", async () => {
    mockInvoke("get_next_company_id", async () => 2042);
    await expect(fetchNextCompanyId()).resolves.toBe(2042);
  });

  it("falls back to 1000 if the backend errors out", async () => {
    mockInvoke("get_next_company_id", async () => {
      throw new Error("db missing");
    });
    await expect(fetchNextCompanyId()).resolves.toBe(1000);
  });
});

describe("emptyCompanyForm", () => {
  it("returns a blank Company with id=0 and the fetched next CompanyID", async () => {
    mockInvoke("get_next_company_id", async () => 1111);
    const form = await emptyCompanyForm();
    expect(form).toMatchObject({
      id: 0,
      company_id: 1111,
      name: "",
      supervisors: [],
    });
    expect(form.owner).toBeNull();
    expect(form.address).toBeNull();
  });
});
