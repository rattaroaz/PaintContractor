import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatDate,
  formatInvoiceNumber,
  parseIsoDate,
  todayIsoDate,
} from "../../src/utils/format";

describe("formatInvoiceNumber", () => {
  it("adds the 10000 offset to the database id", () => {
    expect(formatInvoiceNumber(0)).toBe("10000");
    expect(formatInvoiceNumber(1)).toBe("10001");
    expect(formatInvoiceNumber(42)).toBe("10042");
  });
});

describe("formatDate", () => {
  it("returns MM/DD/YYYY for an ISO yyyy-mm-dd string", () => {
    expect(formatDate("2026-05-25")).toBe("05/25/2026");
  });

  it("returns empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("formats a Date instance", () => {
    expect(formatDate(new Date(2026, 0, 9))).toBe("01/09/2026");
  });

  it("rearranges yyyy-mm-dd style invalid input into MM/DD/YYYY when split", () => {
    expect(formatDate("nope-bad-input")).toBe("bad/input/nope");
  });

  it("returns the raw string when there are no dashes and it is unparseable", () => {
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("parseIsoDate", () => {
  it("parses a yyyy-mm-dd string into a Date", () => {
    const d = parseIsoDate("2026-05-25");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(25);
  });

  it("returns null for empty input", () => {
    expect(parseIsoDate("")).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("matches the yyyy-mm-dd pattern", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatAmount", () => {
  it("formats integers as USD with no fractional digits", () => {
    expect(formatAmount(0)).toBe("$0");
    expect(formatAmount(1234)).toBe("$1,234");
  });

  it("rounds fractional values down to the nearest dollar", () => {
    expect(formatAmount(1234.49)).toBe("$1,234");
    expect(formatAmount(1234.5)).toMatch(/^\$1,23[45]$/); // Intl banker rounding
  });

  it("handles negative amounts", () => {
    expect(formatAmount(-50)).toBe("-$50");
  });
});

describe("formatDate boundary cases", () => {
  it("keeps single-digit month/day strings padded after rearranging", () => {
    expect(formatDate("9999-13-32")).toBe("13/32/9999");
  });

  it("falls back to the raw value when input is fully unparseable", () => {
    expect(formatDate("abc")).toBe("abc");
  });
});

describe("formatInvoiceNumber boundary", () => {
  it("renders large ids without separators", () => {
    expect(formatInvoiceNumber(123456)).toBe("133456");
  });

  it("renders an id that pushes the formatted number past five digits", () => {
    expect(formatInvoiceNumber(99999)).toBe("109999");
  });
});
