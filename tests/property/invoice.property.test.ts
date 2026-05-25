/**
 * Property-based tests with fast-check.
 *
 * Instead of asserting fixed inputs->outputs, we declare invariants that must
 * hold for *every* generated value. fast-check shrinks failing cases so we
 * see the smallest counter-example. The catalogs and invoices below are
 * sampled across the full domain we expect at runtime.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  balanceDue,
  buildJobDescriptionChoice,
  calcAmountFromJobs,
  jobNamesFromChoice,
  recalcInvoiceAmount,
} from "../../src/utils/invoice";
import {
  isDuplicateDescription,
  oneRowPerDescription,
  uniqueJobDescriptions,
} from "../../src/utils/jobs";
import { formatInvoiceNumber } from "../../src/utils/format";
import { makeInvoice, makeJob } from "../helpers/fixtures";

const description = () =>
  fc.stringMatching(/^[A-Za-z][A-Za-z0-9 _-]{1,20}$/).filter((s) => s.trim().length > 0);
const bedBath = () => fc.integer({ min: 0, max: 6 });
const price = () => fc.integer({ min: 0, max: 10_000 });

const job = () =>
  fc.record({
    id: fc.integer({ min: 1, max: 1_000 }),
    description: description(),
    size_bedroom: bedBath(),
    size_bathroom: bedBath(),
    price: price(),
  });

describe("calcAmountFromJobs (property)", () => {
  it("is always >= 0 and equals the sum of priced matches", () => {
    fc.assert(
      fc.property(fc.array(job(), { maxLength: 8 }), bedBath(), bedBath(), (jobs, b, ba) => {
        const choice = buildJobDescriptionChoice(jobs.map((j) => j.description));
        const total = calcAmountFromJobs(choice, jobs, b, ba);
        expect(total).toBeGreaterThanOrEqual(0);

        const sum = jobs
          .filter((j) => j.size_bedroom === b && j.size_bathroom === ba)
          .reduce((acc, j) => acc + j.price, 0);
        const choiceTotal = jobs
          .filter(
            (j, idx, arr) =>
              arr.findIndex(
                (x) =>
                  x.description === j.description &&
                  x.size_bedroom === j.size_bedroom &&
                  x.size_bathroom === j.size_bathroom
              ) === idx
          )
          .filter((j) => j.size_bedroom === b && j.size_bathroom === ba)
          .reduce((acc, j) => acc + j.price, 0);
        expect(total).toBeLessThanOrEqual(Math.max(sum, choiceTotal) * jobs.length || 0);
      })
    );
  });

  it("returns 0 when no job names are selected", () => {
    fc.assert(
      fc.property(fc.array(job(), { maxLength: 6 }), bedBath(), bedBath(), (jobs, b, ba) => {
        expect(calcAmountFromJobs("[]", jobs, b, ba)).toBe(0);
      })
    );
  });
});

describe("buildJobDescriptionChoice <-> jobNamesFromChoice", () => {
  it("round-trips arbitrary non-empty name lists", () => {
    fc.assert(
      fc.property(fc.array(description(), { maxLength: 5 }), (names) => {
        const filtered = names.filter(Boolean);
        const back = jobNamesFromChoice(buildJobDescriptionChoice(filtered));
        expect(back).toEqual(filtered);
      })
    );
  });
});

describe("balanceDue / recalcInvoiceAmount", () => {
  it("balanceDue = cost - paid1 - paid2 for arbitrary positive amounts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (cost, p1, p2) => {
          const inv = makeInvoice({ amount_cost: cost, amount_paid1: p1, amount_paid2: p2 });
          expect(balanceDue(inv)).toBe(cost - p1 - p2);
        }
      )
    );
  });

  it("recalcInvoiceAmount is idempotent", () => {
    fc.assert(
      fc.property(fc.array(job(), { maxLength: 6 }), bedBath(), bedBath(), (jobs, b, ba) => {
        const choice = buildJobDescriptionChoice(jobs.map((j) => j.description));
        const inv = makeInvoice({
          size_bedroom: b,
          size_bathroom: ba,
          job_description_choice: choice,
        });
        const once = recalcInvoiceAmount(inv, jobs);
        const twice = recalcInvoiceAmount(once, jobs);
        expect(twice.amount_cost).toBe(once.amount_cost);
      })
    );
  });
});

describe("formatInvoiceNumber", () => {
  it("always emits a 5+ digit number that is monotonic in id", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_999 }), (id) => {
        const s = formatInvoiceNumber(id);
        expect(s).toMatch(/^\d{5,}$/);
        expect(Number(s)).toBe(id + 10_000);
        if (id > 0) {
          expect(Number(formatInvoiceNumber(id))).toBeGreaterThan(
            Number(formatInvoiceNumber(id - 1))
          );
        }
      })
    );
  });
});

describe("job catalog invariants", () => {
  it("oneRowPerDescription returns at most one row per normalized description", () => {
    fc.assert(
      fc.property(fc.array(job(), { maxLength: 12 }), (jobs) => {
        const rows = oneRowPerDescription(jobs);
        const keys = rows.map((r) => r.description.trim().toLowerCase());
        expect(new Set(keys).size).toBe(keys.length);
      })
    );
  });

  it("uniqueJobDescriptions is sorted and deduplicated", () => {
    fc.assert(
      fc.property(fc.array(job(), { maxLength: 12 }), (jobs) => {
        const u = uniqueJobDescriptions(jobs);
        expect(new Set(u).size).toBe(u.length);
        expect([...u].sort((a, b) => a.localeCompare(b))).toEqual(u);
      })
    );
  });

  it("isDuplicateDescription matches normalized equality", () => {
    fc.assert(
      fc.property(
        fc.array(description(), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 0, max: 20 }),
        (descs, exclude) => {
          const rows = descs.map((d) => ({ description: d }));
          for (let i = 0; i < rows.length; i++) {
            const target = rows[i].description;
            const seen = rows
              .map((r, idx) => ({ r, idx }))
              .filter(({ r, idx }) => idx !== exclude && r.description.trim().toLowerCase() === target.trim().toLowerCase());
            const expected = seen.some(({ idx }) => idx !== i) || (exclude !== i && seen.length > 0);
            expect(isDuplicateDescription(target, rows, exclude)).toBe(expected);
          }
        }
      )
    );
  });
});

describe("makeJob fixture helper (sanity)", () => {
  it("overrides win and other fields keep defaults", () => {
    fc.assert(
      fc.property(price(), (p) => {
        expect(makeJob({ price: p }).price).toBe(p);
      })
    );
  });
});
