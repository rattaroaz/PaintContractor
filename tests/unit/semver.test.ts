import { describe, expect, it } from "vitest";
import { isVersionNewer, parseSemver } from "../../src/lib/semver";

describe("parseSemver", () => {
  it("parses three-part versions", () => {
    expect(parseSemver("1.2.3")).toEqual([1, 2, 3]);
  });

  it("parses two-part versions as patch 0", () => {
    expect(parseSemver("1.2")).toEqual([1, 2, 0]);
  });

  it("strips v prefix and pre-release", () => {
    expect(parseSemver("v1.2.0-beta")).toEqual([1, 2, 0]);
  });
});

describe("isVersionNewer", () => {
  it("returns true when candidate is newer", () => {
    expect(isVersionNewer("1.2.0", "1.1.9")).toBe(true);
  });

  it("returns false for equal versions", () => {
    expect(isVersionNewer("1.1.0", "1.1.0")).toBe(false);
  });

  it("handles v prefix", () => {
    expect(isVersionNewer("v1.2.0", "1.1.0")).toBe(true);
  });

  it("treats two-part versions as patch 0", () => {
    expect(isVersionNewer("1.2", "1.1.9")).toBe(true);
  });
});
