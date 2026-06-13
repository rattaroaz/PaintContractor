/**
 * Contract tests.
 *
 * Each Tauri command we call from the frontend has an implicit JSON contract
 * with the Rust backend. We capture that contract via Zod schemas (see
 * tests/helpers/contracts.ts) and verify that:
 *   1. The TypeScript fixtures we use elsewhere conform to the schema.
 *   2. Sample payloads that match the Rust struct shapes parse cleanly.
 *   3. Drift (extra/missing fields, wrong types) is detected.
 *
 * If a Rust model adds, renames, or removes a field, both the TS type and
 * the matching Zod schema must be updated -- otherwise this test fails and
 * forces the contract back into agreement.
 */
import { describe, expect, it } from "vitest";
import {
  appLogEntrySchema,
  companySchema,
  contractorSchema,
  invoiceSchema,
  jobDescriptionSchema,
  loggingPathsSchema,
  myCompanyInfoSchema,
  operationResult,
  propertySchema,
  supervisorSchema,
  updateSettingsSchema,
} from "../helpers/contracts";
import {
  makeCompany,
  makeContractor,
  makeInvoice,
  makeJob,
  makeMyCompanyInfo,
  makeProperty,
  makeSupervisor,
} from "../helpers/fixtures";

describe("entity contracts", () => {
  it("MyCompanyInfo fixture matches schema", () => {
    expect(myCompanyInfoSchema.parse(makeMyCompanyInfo())).toBeDefined();
  });

  it("Property/Supervisor/Company fixtures match nested schemas", () => {
    expect(propertySchema.parse(makeProperty())).toBeDefined();
    expect(supervisorSchema.parse(makeSupervisor())).toBeDefined();
    const co = companySchema.parse(makeCompany());
    expect(co.supervisors[0].properties).toHaveLength(1);
  });

  it("Contractor fixture matches schema", () => {
    expect(contractorSchema.parse(makeContractor())).toBeDefined();
  });

  it("JobDescription fixture matches schema", () => {
    expect(jobDescriptionSchema.parse(makeJob())).toBeDefined();
  });

  it("Invoice fixture matches schema and obeys paid<=cost invariant", () => {
    expect(invoiceSchema.parse(makeInvoice())).toBeDefined();
  });

  it("rejects an invoice where paid totals exceed cost", () => {
    expect(() =>
      invoiceSchema.parse(makeInvoice({ amount_cost: 50, amount_paid1: 100 }))
    ).toThrow(/cannot be greater/);
  });

  it("rejects a company with CompanyID outside 1000..9999", () => {
    expect(() => companySchema.parse(makeCompany({ company_id: 50 }))).toThrow();
    expect(() =>
      companySchema.parse(makeCompany({ company_id: 99999 }))
    ).toThrow();
  });

  it("rejects a property with the wrong types (drift detection)", () => {
    const bad = { ...makeProperty(), supervisor_id: "ten" as unknown as number };
    expect(() => propertySchema.parse(bad)).toThrow();
  });
});

describe("OperationResult<T> envelope", () => {
  const schema = operationResult(jobDescriptionSchema);

  it("accepts a successful payload", () => {
    expect(
      schema.parse({ success: true, message: "", data: makeJob() })
    ).toBeDefined();
  });

  it("accepts a failure payload without data", () => {
    expect(schema.parse({ success: false, message: "bad" })).toBeDefined();
  });

  it("rejects when success is missing", () => {
    expect(() => schema.parse({ message: "x" })).toThrow();
  });
});

describe("system contracts", () => {
  it("UpdateSettings payload matches schema", () => {
    expect(
      updateSettingsSchema.parse({
        repository_owner: "rattaroaz",
        repository_name: "PaintContractor",
        check_on_startup: false,
        enabled: true,
        last_check: null,
      })
    ).toBeDefined();
  });

  it("LoggingPaths payload matches schema", () => {
    expect(
      loggingPathsSchema.parse({
        database_path: "C:/data/app.db",
        log_directory: "C:/data/logs",
      })
    ).toBeDefined();
  });

  it("AppLogEntry payload matches schema", () => {
    expect(
      appLogEntrySchema.parse({
        timestamp: "2026-06-13 10:00:00",
        level: "info",
        message: "Update check started",
      })
    ).toBeDefined();
  });
});
