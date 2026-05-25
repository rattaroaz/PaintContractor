import { describe, expect, it } from "vitest";
import {
  findJobByKey,
  isDuplicateDescription,
  jobRowKey,
  normalizeDescription,
  oneRowPerDescription,
  priceForJobKey,
  uniqueJobDescriptions,
} from "../../src/utils/jobs";
import { makeJob } from "../helpers/fixtures";

describe("findJobByKey / priceForJobKey", () => {
  const jobs = [
    makeJob({ id: 1, description: "Paint", size_bedroom: 1, size_bathroom: 1, price: 50 }),
    makeJob({ id: 2, description: "Paint", size_bedroom: 2, size_bathroom: 2, price: 100 }),
  ];

  it("matches by trimmed description + bed + bath", () => {
    expect(findJobByKey(jobs, "  Paint  ", 2, 2)?.id).toBe(2);
  });

  it("returns undefined when nothing matches", () => {
    expect(findJobByKey(jobs, "Paint", 9, 9)).toBeUndefined();
    expect(priceForJobKey(jobs, "Paint", 9, 9)).toBe(0);
  });
});

describe("uniqueJobDescriptions", () => {
  it("dedupes by trimmed description, sorted alphabetically", () => {
    const jobs = [
      makeJob({ description: "Trim", size_bedroom: 1, size_bathroom: 1 }),
      makeJob({ description: "Paint", size_bedroom: 1, size_bathroom: 1 }),
      makeJob({ description: "Paint", size_bedroom: 2, size_bathroom: 2 }),
      makeJob({ description: "", size_bedroom: 0, size_bathroom: 0 }),
    ];
    expect(uniqueJobDescriptions(jobs)).toEqual(["Paint", "Trim"]);
  });
});

describe("oneRowPerDescription", () => {
  it("collapses multiple combos to one row, preferring the smallest bed/bath", () => {
    const jobs = [
      makeJob({ id: 1, description: "Paint", size_bedroom: 3, size_bathroom: 2, price: 200 }),
      makeJob({ id: 2, description: "Paint", size_bedroom: 1, size_bathroom: 1, price: 50 }),
      makeJob({ id: 3, description: "Trim", size_bedroom: 2, size_bathroom: 2, price: 30 }),
    ];
    const rows = oneRowPerDescription(jobs);
    expect(rows.map((r) => r.description)).toEqual(["Paint", "Trim"]);
    expect(rows[0].size_bedroom).toBe(1);
    expect(rows[0].price).toBe(50);
  });

  it("returns an empty list when given no jobs", () => {
    expect(oneRowPerDescription([])).toEqual([]);
  });
});

describe("isDuplicateDescription", () => {
  it("detects duplicates by normalized case", () => {
    const rows = [{ description: "Paint" }, { description: "trim" }];
    expect(isDuplicateDescription("paint", rows, 1)).toBe(true);
    expect(isDuplicateDescription("Paint", rows, 0)).toBe(false);
    expect(isDuplicateDescription("Drywall", rows, -1)).toBe(false);
    expect(isDuplicateDescription("", rows, -1)).toBe(false);
  });
});

describe("normalizeDescription / jobRowKey", () => {
  it("normalizes via trim + lowercase", () => {
    expect(normalizeDescription("  Hello  ")).toBe("hello");
  });

  it("builds a stable per-combo key", () => {
    expect(jobRowKey(" Paint ", 1, 2)).toBe("Paint|1|2");
  });
});
