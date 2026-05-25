import { describe, expect, it } from "vitest";
import {
  balanceDue,
  buildAddresses,
  buildCompanyNames,
  buildJobDescriptionChoice,
  calcAmountFromJobs,
  filterByAddress,
  filterByCompany,
  filterByContractor,
  filterByDateRange,
  filterByWorkDate,
  InvoiceStatus,
  invoiceToExportRow,
  isReceivable,
  jobNamesFromChoice,
  recalcInvoiceAmount,
  resolveJobDescriptions,
  toExInvoice,
  VIEW_ALL,
} from "../../src/utils/invoice";
import { formatDate, formatInvoiceNumber } from "../../src/utils/format";
import { makeInvoice, makeJob } from "../helpers/fixtures";

describe("InvoiceStatus enum", () => {
  it("matches the cleanroom spec values", () => {
    expect(InvoiceStatus.Draft).toBe(0);
    expect(InvoiceStatus.Submitted).toBe(1);
    expect(InvoiceStatus.Paid).toBe(2);
  });
});

describe("jobNamesFromChoice / buildJobDescriptionChoice", () => {
  it("round-trips a list of names", () => {
    const choice = buildJobDescriptionChoice(["A", "B"]);
    expect(jobNamesFromChoice(choice)).toEqual(["A", "B"]);
  });

  it("returns [] for invalid JSON", () => {
    expect(jobNamesFromChoice("not-json")).toEqual([]);
  });

  it("filters falsy names", () => {
    expect(buildJobDescriptionChoice(["", "A", "", "B"])).toBe('["A","B"]');
  });
});

describe("calcAmountFromJobs", () => {
  const jobs = [
    makeJob({ description: "Paint", size_bedroom: 2, size_bathroom: 2, price: 100 }),
    makeJob({ description: "Paint", size_bedroom: 1, size_bathroom: 1, price: 50 }),
    makeJob({ description: "Trim", size_bedroom: 2, size_bathroom: 2, price: 25 }),
  ];

  it("sums prices for the matching bed/bath combo", () => {
    const choice = buildJobDescriptionChoice(["Paint", "Trim"]);
    expect(calcAmountFromJobs(choice, jobs, 2, 2)).toBe(125);
  });

  it("uses the price for the requested combo, not a default", () => {
    const choice = buildJobDescriptionChoice(["Paint"]);
    expect(calcAmountFromJobs(choice, jobs, 1, 1)).toBe(50);
  });

  it("falls back to 0 when no combo matches", () => {
    const choice = buildJobDescriptionChoice(["Paint"]);
    expect(calcAmountFromJobs(choice, jobs, 5, 5)).toBe(0);
  });
});

describe("resolveJobDescriptions", () => {
  it("returns JobDescription objects for matching combos", () => {
    const jobs = [makeJob({ description: "X", size_bedroom: 1, size_bathroom: 1, price: 11 })];
    const result = resolveJobDescriptions(buildJobDescriptionChoice(["X"]), jobs, 1, 1);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(11);
  });
});

describe("balanceDue / isReceivable", () => {
  it("returns amount_cost - paid1 - paid2", () => {
    const inv = makeInvoice({ amount_cost: 100, amount_paid1: 30, amount_paid2: 20 });
    expect(balanceDue(inv)).toBe(50);
    expect(isReceivable(inv)).toBe(true);
  });

  it("treats fully paid as not receivable", () => {
    const inv = makeInvoice({ amount_cost: 100, amount_paid1: 100, amount_paid2: 0 });
    expect(isReceivable(inv)).toBe(false);
  });
});

describe("filter helpers", () => {
  const invoices = [
    makeInvoice({ id: 1, company_name: "A", property_address: "1", work_date: "2026-01-01", contractor_name: "X" }),
    makeInvoice({ id: 2, company_name: "B", property_address: "2", work_date: "2026-06-15", contractor_name: "Y" }),
    makeInvoice({ id: 3, company_name: "A", property_address: "1", work_date: "2026-12-31", contractor_name: "X" }),
  ];

  it("filterByCompany returns all when View All", () => {
    expect(filterByCompany(invoices, VIEW_ALL)).toHaveLength(3);
  });

  it("filterByCompany filters by exact name", () => {
    expect(filterByCompany(invoices, "A")).toHaveLength(2);
  });

  it("filterByAddress / filterByContractor / filterByWorkDate respect View All and exact match", () => {
    expect(filterByAddress(invoices, "1")).toHaveLength(2);
    expect(filterByContractor(invoices, "Y")).toHaveLength(1);
    expect(filterByWorkDate(invoices, "2026-12-31")).toHaveLength(1);
  });

  it("filterByDateRange is inclusive on both ends", () => {
    expect(filterByDateRange(invoices, "2026-01-01", "2026-06-15")).toHaveLength(2);
  });

  it("filterByDateRange returns all when neither bound provided", () => {
    expect(filterByDateRange(invoices)).toHaveLength(3);
  });
});

describe("buildCompanyNames / buildAddresses", () => {
  it("prepends View All and sorts unique values", () => {
    const invoices = [
      makeInvoice({ company_name: "B", property_address: "2" }),
      makeInvoice({ company_name: "A", property_address: "1" }),
      makeInvoice({ company_name: "A", property_address: "1" }),
    ];
    expect(buildCompanyNames(invoices)).toEqual([VIEW_ALL, "A", "B"]);
    expect(buildAddresses(invoices)).toEqual([VIEW_ALL, "1", "2"]);
  });
});

describe("recalcInvoiceAmount + toExInvoice + invoiceToExportRow", () => {
  it("recalcInvoiceAmount uses the invoice's own bed/bath", () => {
    const jobs = [makeJob({ description: "P", size_bedroom: 3, size_bathroom: 1, price: 77 })];
    const inv = makeInvoice({
      size_bedroom: 3,
      size_bathroom: 1,
      job_description_choice: JSON.stringify(["P"]),
    });
    expect(recalcInvoiceAmount(inv, jobs).amount_cost).toBe(77);
  });

  it("toExInvoice computes days_overdue >= 0", () => {
    const inv = makeInvoice({ invoice_created_date: "2024-01-01" });
    const ex = toExInvoice(inv);
    expect(ex.days_overdue).toBeGreaterThanOrEqual(0);
  });

  it("invoiceToExportRow uses formatted invoice number + MM/DD/YYYY dates", () => {
    const inv = makeInvoice({ id: 5, work_date: "2026-01-02" });
    const row = invoiceToExportRow(inv, formatInvoiceNumber, formatDate);
    expect(row["Invoice Number"]).toBe("10005");
    expect(row["Work Date"]).toBe("01/02/2026");
  });
});
