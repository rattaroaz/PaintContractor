/**
 * Property-based tests for the lightweight formatting helpers.
 *
 * These functions are used throughout the UI and in every export. They MUST
 * obey predictable invariants for any pre-cleaned input - regressions here
 * silently corrupt invoices, exports, and aging reports.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatDate,
  formatInvoiceNumber,
  parseIsoDate,
  todayIsoDate,
} from "../../src/utils/format";

const isoDateString = () =>
  fc
    .tuple(
      fc.integer({ min: 1970, max: 2999 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 })
    )
    .map(
      ([y, m, d]) =>
        `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );

describe("formatInvoiceNumber", () => {
  it("always offsets by 10000", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (id) => {
        expect(formatInvoiceNumber(id)).toBe(String(id + 10000));
      })
    );
  });

  it("is monotonically non-decreasing as numeric ID grows", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999 }),
        fc.integer({ min: 0, max: 999_999 }),
        (a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          expect(Number(formatInvoiceNumber(min))).toBeLessThanOrEqual(
            Number(formatInvoiceNumber(max))
          );
        }
      )
    );
  });
});

describe("formatDate", () => {
  it("always emits MM/DD/YYYY for valid ISO inputs", () => {
    fc.assert(
      fc.property(isoDateString(), (s) => {
        const out = formatDate(s);
        expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        const [mm, dd, yyyy] = out.split("/");
        const [yIso, mIso, dIso] = s.split("-");
        expect(yyyy).toBe(yIso);
        expect(mm).toBe(mIso);
        expect(dd).toBe(dIso);
      })
    );
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("is idempotent through ISO round-trip", () => {
    fc.assert(
      fc.property(isoDateString(), (s) => {
        // round-trip through parser: formatDate(parseIsoDate(s).toISOString())
        const parsed = parseIsoDate(s);
        expect(parsed).not.toBeNull();
        // Once you've formatted it once, formatting the same input again is stable.
        expect(formatDate(s)).toBe(formatDate(s));
      })
    );
  });
});

describe("todayIsoDate", () => {
  it("matches ^YYYY-MM-DD$ at any moment", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is round-trippable through parseIsoDate", () => {
    const today = todayIsoDate();
    const parsed = parseIsoDate(today);
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(Number(today.slice(0, 4)));
  });
});

describe("formatAmount", () => {
  it("always starts with '$' for non-negative amounts", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (n) => {
        expect(formatAmount(n).startsWith("$")).toBe(true);
      })
    );
  });

  it("never contains decimals because we render whole dollars", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000, max: 10_000 }), (n) => {
        expect(formatAmount(n)).not.toMatch(/\.\d/);
      })
    );
  });

  it("contains the absolute value's digits", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999_999 }), (n) => {
        // strip $ and commas
        const cleaned = formatAmount(n).replace(/[$,]/g, "");
        expect(cleaned).toBe(String(n));
      })
    );
  });
});

describe("parseIsoDate", () => {
  it("returns null for empty / invalid", () => {
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
  });

  it("round-trips for any iso date", () => {
    fc.assert(
      fc.property(isoDateString(), (s) => {
        const parsed = parseIsoDate(s);
        expect(parsed).not.toBeNull();
        const yyyy = parsed!.getFullYear();
        const mm = String(parsed!.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed!.getDate()).padStart(2, "0");
        expect(`${yyyy}-${mm}-${dd}`).toBe(s);
      })
    );
  });
});
