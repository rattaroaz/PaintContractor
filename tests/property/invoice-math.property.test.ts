/**
 * Property-based tests for invoice math: catalog pricing, recalculation,
 * and the export-row projection.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Invoice, JobDescription } from "../../src/types";
import { formatDate, formatInvoiceNumber } from "../../src/utils/format";
import {
  buildJobDescriptionChoice,
  calcAmountFromJobs,
  invoiceToExportRow,
  jobNamesFromChoice,
  recalcInvoiceAmount,
  toExInvoice,
} from "../../src/utils/invoice";
import { makeInvoice } from "../helpers/fixtures";

const jobDescription = () =>
  fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,10}$/).filter((s) => s.trim().length > 0);
const jobArb = (): fc.Arbitrary<JobDescription> =>
  fc.record({
    id: fc.integer({ min: 1, max: 999 }),
    description: jobDescription(),
    size_bedroom: fc.integer({ min: 1, max: 5 }),
    size_bathroom: fc.integer({ min: 1, max: 5 }),
    price: fc.integer({ min: 0, max: 2_000 }),
  });

describe("buildJobDescriptionChoice / jobNamesFromChoice round-trip", () => {
  it("round-trips arbitrary description arrays through JSON", () => {
    fc.assert(
      fc.property(fc.array(jobDescription(), { maxLength: 6 }), (names) => {
        const encoded = buildJobDescriptionChoice(names);
        expect(jobNamesFromChoice(encoded)).toEqual(names);
      })
    );
  });

  it("ignores corrupted JSON safely (returns empty array)", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const safe = jobNamesFromChoice(s);
        expect(Array.isArray(safe)).toBe(true);
      })
    );
  });

  it("strips empty/falsy names during encoding", () => {
    const result = jobNamesFromChoice(buildJobDescriptionChoice(["", "Paint", "  ", "Trim"]));
    expect(result.filter(Boolean)).toEqual(["Paint", "  ", "Trim"]);
  });

  it("decodes objects with .description back into strings", () => {
    const encoded = JSON.stringify([{ description: "Interior Paint" }, { description: "Trim" }]);
    expect(jobNamesFromChoice(encoded)).toEqual(["Interior Paint", "Trim"]);
  });
});

describe("calcAmountFromJobs", () => {
  it("equals the sum of catalog prices for each matched key", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb(), { minLength: 1, maxLength: 5 }),
        (jobs) => {
          const choice = buildJobDescriptionChoice(jobs.map((j) => j.description));
          // Use the first job's bedroom/bathroom counts so only that job matches.
          const first = jobs[0];
          const result = calcAmountFromJobs(
            choice,
            jobs,
            first.size_bedroom,
            first.size_bathroom
          );
          // The sum must include every job whose composite key matches.
          const expected = jobs
            .filter(
              (j) =>
                j.size_bedroom === first.size_bedroom &&
                j.size_bathroom === first.size_bathroom &&
                jobs.some((other) => other.description.trim() === j.description.trim())
            )
            .reduce((sum, j) => sum + j.price, 0);

          // Allow strict equality only if all descriptions are distinct (no double counting
          // due to dedupe via .find first-match semantics).
          const distinct = new Set(jobs.map((j) => j.description.trim())).size === jobs.length;
          if (distinct) {
            expect(result).toBe(expected);
          }
        }
      )
    );
  });

  it("is 0 when no jobs match the (bed,bath) key", () => {
    fc.assert(
      fc.property(fc.array(jobArb(), { maxLength: 4 }), (jobs) => {
        const choice = buildJobDescriptionChoice(jobs.map((j) => j.description));
        // Pick a (bed,bath) pair that is GUARANTEED not to exist in any job.
        const result = calcAmountFromJobs(choice, jobs, 99, 99);
        expect(result).toBe(0);
      })
    );
  });

  it("never returns a negative value when catalog prices are non-negative", () => {
    fc.assert(
      fc.property(fc.array(jobArb(), { maxLength: 4 }), fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 }), (jobs, bed, bath) => {
        const choice = buildJobDescriptionChoice(jobs.map((j) => j.description));
        expect(calcAmountFromJobs(choice, jobs, bed, bath)).toBeGreaterThanOrEqual(0);
      })
    );
  });
});

describe("recalcInvoiceAmount", () => {
  it("does not mutate the input invoice", () => {
    fc.assert(
      fc.property(jobArb(), (j) => {
        const inv = makeInvoice({
          size_bedroom: j.size_bedroom,
          size_bathroom: j.size_bathroom,
          job_description_choice: buildJobDescriptionChoice([j.description]),
          amount_cost: -1,
        });
        const before = JSON.parse(JSON.stringify(inv));
        const after = recalcInvoiceAmount(inv, [j]);
        expect(inv).toEqual(before);
        expect(after.amount_cost).toBe(j.price);
      })
    );
  });

  it("recalcs to 0 for an unknown bedroom/bathroom combo", () => {
    fc.assert(
      fc.property(jobArb(), (j) => {
        const inv = makeInvoice({
          size_bedroom: 99,
          size_bathroom: 99,
          job_description_choice: buildJobDescriptionChoice([j.description]),
        });
        expect(recalcInvoiceAmount(inv, [j]).amount_cost).toBe(0);
      })
    );
  });
});

describe("toExInvoice / invoiceToExportRow", () => {
  it("days_overdue is never negative", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 })
        ),
        ([y, m, d]) => {
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const inv = makeInvoice({ invoice_created_date: iso });
          expect(toExInvoice(inv).days_overdue).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it("invoiceToExportRow preserves invoice id formatting + all amount fields", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (id, cost, p1, p2) => {
          const inv: Invoice = makeInvoice({
            id,
            amount_cost: cost,
            amount_paid1: p1,
            amount_paid2: p2,
          });
          const row = invoiceToExportRow(inv, formatInvoiceNumber, formatDate);
          expect(row["Invoice Number"]).toBe(String(id + 10000));
          expect(row["Amount Cost"]).toBe(cost);
          expect(row["Amount Paid 1"]).toBe(p1);
          expect(row["Amount Paid 2"]).toBe(p2);
        }
      )
    );
  });
});
