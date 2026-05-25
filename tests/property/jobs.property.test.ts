/**
 * Property-based tests for the job catalog helpers.
 *
 * The catalog is the heart of every estimate. These invariants protect us
 * from regressions in dedupe, key resolution, and price lookup logic.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { JobDescription } from "../../src/types";
import {
  findJobByKey,
  isDuplicateDescription,
  jobRowKey,
  normalizeDescription,
  oneRowPerDescription,
  priceForJobKey,
  uniqueJobDescriptions,
} from "../../src/utils/jobs";

const jobDescription = () =>
  fc
    .stringMatching(/^[A-Za-z ]{1,12}$/)
    .filter((s) => s.trim().length > 0);
const size = () => fc.integer({ min: 1, max: 6 });
const price = () => fc.integer({ min: 0, max: 5_000 });

const jobArb = (): fc.Arbitrary<JobDescription> =>
  fc
    .record({
      id: fc.integer({ min: 1, max: 10_000 }),
      description: jobDescription(),
      size_bedroom: size(),
      size_bathroom: size(),
      price: price(),
    })
    .map((r) => ({ ...r }));

describe("normalizeDescription", () => {
  it("is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(normalizeDescription(normalizeDescription(s))).toBe(
          normalizeDescription(s)
        );
      })
    );
  });

  it("strips outer whitespace and is case-insensitive", () => {
    fc.assert(
      fc.property(jobDescription(), (d) => {
        expect(normalizeDescription(`  ${d.toUpperCase()}  `)).toBe(
          normalizeDescription(d)
        );
      })
    );
  });
});

describe("jobRowKey", () => {
  it("forms unique keys per (description, bedrooms, bathrooms)", () => {
    fc.assert(
      fc.property(
        jobDescription(),
        size(),
        size(),
        size(),
        size(),
        (desc, b1, b2, c1, c2) => {
          fc.pre(b1 !== c1 || b2 !== c2);
          expect(jobRowKey(desc, b1, b2)).not.toBe(jobRowKey(desc, c1, c2));
        }
      )
    );
  });

  it("normalizes leading/trailing whitespace in the description", () => {
    fc.assert(
      fc.property(jobDescription(), size(), size(), (desc, b, ba) => {
        expect(jobRowKey(`  ${desc}  `, b, ba)).toBe(jobRowKey(desc, b, ba));
      })
    );
  });
});

describe("uniqueJobDescriptions", () => {
  it("returns each description exactly once, lexicographically sorted", () => {
    fc.assert(
      fc.property(fc.array(jobArb(), { maxLength: 10 }), (jobs) => {
        const result = uniqueJobDescriptions(jobs);
        expect(new Set(result).size).toBe(result.length);
        expect([...result].sort((a, b) => a.localeCompare(b))).toEqual(result);
        // every value comes from the trimmed descriptions of the input
        for (const r of result) {
          expect(jobs.some((j) => j.description.trim() === r)).toBe(true);
        }
      })
    );
  });

  it("treats whitespace-only descriptions as absent", () => {
    const out = uniqueJobDescriptions([
      { id: 1, description: "   ", size_bedroom: 1, size_bathroom: 1, price: 0 },
      { id: 2, description: "", size_bedroom: 1, size_bathroom: 1, price: 0 },
    ]);
    expect(out).toEqual([]);
  });
});

describe("findJobByKey / priceForJobKey", () => {
  it("findJobByKey returns the saved job when the composite key matches", () => {
    fc.assert(
      fc.property(jobArb(), (job) => {
        const found = findJobByKey(
          [job],
          job.description,
          job.size_bedroom,
          job.size_bathroom
        );
        expect(found).toEqual(job);
      })
    );
  });

  it("priceForJobKey is 0 when the composite key is absent", () => {
    fc.assert(
      fc.property(jobArb(), jobDescription(), (job, otherDesc) => {
        fc.pre(otherDesc.trim() !== job.description.trim());
        expect(
          priceForJobKey([job], otherDesc, job.size_bedroom, job.size_bathroom)
        ).toBe(0);
      })
    );
  });
});

describe("oneRowPerDescription", () => {
  it("returns exactly one row per unique normalized description", () => {
    fc.assert(
      fc.property(fc.array(jobArb(), { minLength: 1, maxLength: 10 }), (jobs) => {
        const reduced = oneRowPerDescription(jobs);
        const seen = new Set(reduced.map((r) => normalizeDescription(r.description)));
        expect(seen.size).toBe(reduced.length);

        // Every unique normalized description in jobs must appear exactly once.
        const expected = new Set(
          jobs
            .map((j) => normalizeDescription(j.description))
            .filter((s) => s !== "")
        );
        expect(seen.size).toBe(expected.size);
      })
    );
  });

  it("picks the row with the smallest (bedroom, bathroom) lex pair per description", () => {
    fc.assert(
      fc.property(fc.array(jobArb(), { minLength: 2, maxLength: 8 }), (jobs) => {
        const reduced = oneRowPerDescription(jobs);
        for (const row of reduced) {
          const sameDesc = jobs.filter(
            (j) => normalizeDescription(j.description) === normalizeDescription(row.description)
          );
          for (const other of sameDesc) {
            const cmp =
              row.size_bedroom === other.size_bedroom
                ? row.size_bathroom - other.size_bathroom
                : row.size_bedroom - other.size_bedroom;
            expect(cmp).toBeLessThanOrEqual(0);
          }
        }
      })
    );
  });

  it("output is alphabetically sorted by description", () => {
    fc.assert(
      fc.property(fc.array(jobArb(), { maxLength: 12 }), (jobs) => {
        const reduced = oneRowPerDescription(jobs);
        const sorted = [...reduced].sort((a, b) =>
          a.description.localeCompare(b.description)
        );
        expect(reduced).toEqual(sorted);
      })
    );
  });
});

describe("isDuplicateDescription", () => {
  it("is false when no other row matches", () => {
    fc.assert(
      fc.property(jobDescription(), jobDescription(), (a, b) => {
        fc.pre(normalizeDescription(a) !== normalizeDescription(b));
        expect(
          isDuplicateDescription(a, [{ description: b }], -1)
        ).toBe(false);
      })
    );
  });

  it("is true when another row carries the same normalized description", () => {
    fc.assert(
      fc.property(jobDescription(), (a) => {
        expect(
          isDuplicateDescription(a, [{ description: `  ${a.toUpperCase()}  ` }], -1)
        ).toBe(true);
      })
    );
  });

  it("excludes the row at excludeIndex from the comparison", () => {
    fc.assert(
      fc.property(jobDescription(), (a) => {
        // Only entry is the one we're excluding, so result should be false.
        expect(isDuplicateDescription(a, [{ description: a }], 0)).toBe(false);
      })
    );
  });
});
