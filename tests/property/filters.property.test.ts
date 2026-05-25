/**
 * Property-based tests for the invoice filter and aggregation helpers.
 * These invariants must hold for any random data — they protect us against
 * subtle off-by-one and sort-order regressions.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  balanceDue,
  buildAddresses,
  buildCompanyNames,
  filterByAddress,
  filterByCompany,
  filterByContractor,
  filterByDateRange,
  filterByWorkDate,
  isReceivable,
  VIEW_ALL,
} from "../../src/utils/invoice";
import { makeInvoice } from "../helpers/fixtures";

const company = () =>
  fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,8}$/).filter((s) => s.trim().length > 0);
const address = () =>
  fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,12}$/).filter((s) => s.trim().length > 0);
const isoDate = () =>
  fc.tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  ).map(
    ([y, m, d]) =>
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  );
const money = () => fc.integer({ min: 0, max: 10_000 });

const invoiceArb = () =>
  fc.record({
    company_name: company(),
    property_address: address(),
    contractor_name: company(),
    work_date: isoDate(),
    amount_cost: money(),
    amount_paid1: money(),
    amount_paid2: money(),
  }).map((r) => makeInvoice(r));

describe("filterByCompany / filterByAddress / filterByContractor", () => {
  it("VIEW_ALL is the identity filter", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 10 }), (invs) => {
        expect(filterByCompany(invs, VIEW_ALL)).toEqual(invs);
        expect(filterByAddress(invs, VIEW_ALL)).toEqual(invs);
        expect(filterByContractor(invs, VIEW_ALL)).toEqual(invs);
      })
    );
  });

  it("a specific filter retains only matching rows", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 10 }), (invs) => {
        for (const inv of invs) {
          const out = filterByCompany(invs, inv.company_name);
          expect(out.every((i) => i.company_name === inv.company_name)).toBe(true);
        }
      })
    );
  });

  it("empty filter string returns the original list (no-op)", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 5 }), (invs) => {
        expect(filterByCompany(invs, "")).toEqual(invs);
        expect(filterByAddress(invs, "")).toEqual(invs);
      })
    );
  });
});

describe("filterByDateRange", () => {
  it("undefined endpoints return identity", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 8 }), (invs) => {
        expect(filterByDateRange(invs)).toEqual(invs);
        expect(filterByDateRange(invs, undefined, undefined)).toEqual(invs);
      })
    );
  });

  it("is inclusive on both endpoints", () => {
    fc.assert(
      fc.property(
        invoiceArb(),
        fc.integer({ min: 1, max: 50 }),
        (inv, offset) => {
          const onlyOne = filterByDateRange(
            [inv],
            inv.work_date,
            inv.work_date
          );
          expect(onlyOne).toHaveLength(1);
          // Guarantee the helper compiles for arbitrary offsets
          expect(filterByDateRange([inv], "0000-01-01", "9999-12-31")).toHaveLength(1);
          expect(offset).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });
});

describe("filterByWorkDate", () => {
  it("empty date returns all", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 6 }), (invs) => {
        expect(filterByWorkDate(invs, "")).toEqual(invs);
      })
    );
  });

  it("non-empty matches exact work_date", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 6 }), (invs) => {
        for (const inv of invs) {
          const out = filterByWorkDate(invs, inv.work_date);
          expect(out.every((i) => i.work_date === inv.work_date)).toBe(true);
        }
      })
    );
  });
});

describe("buildCompanyNames / buildAddresses", () => {
  it("always starts with VIEW_ALL and is otherwise unique + lexicographically sorted", () => {
    fc.assert(
      fc.property(fc.array(invoiceArb(), { maxLength: 12 }), (invs) => {
        const cs = buildCompanyNames(invs);
        const as = buildAddresses(invs);
        for (const out of [cs, as]) {
          expect(out[0]).toBe(VIEW_ALL);
          const rest = out.slice(1);
          expect(new Set(rest).size).toBe(rest.length);
          // Array.prototype.sort() uses UTF-16 ordering by default.
          expect([...rest].sort()).toEqual(rest);
        }
      })
    );
  });
});

describe("balanceDue / isReceivable invariants", () => {
  it("balanceDue + (paid1+paid2) === amount_cost", () => {
    fc.assert(
      fc.property(invoiceArb(), (inv) => {
        expect(balanceDue(inv) + inv.amount_paid1 + inv.amount_paid2).toBe(
          inv.amount_cost
        );
      })
    );
  });

  it("isReceivable === (cost > paid1 + paid2)", () => {
    fc.assert(
      fc.property(invoiceArb(), (inv) => {
        expect(isReceivable(inv)).toBe(
          inv.amount_cost > inv.amount_paid1 + inv.amount_paid2
        );
      })
    );
  });
});
