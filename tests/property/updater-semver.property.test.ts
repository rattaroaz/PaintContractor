import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { isVersionNewer, parseSemver } from "../../src/lib/semver";

const semverArb = fc.tuple(
  fc.integer({ min: 0, max: 20 }),
  fc.integer({ min: 0, max: 50 }),
  fc.integer({ min: 0, max: 99 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

describe("updater semver decisions", () => {
  it("never treats the same version as newer", () => {
    fc.assert(
      fc.property(semverArb, (version) => {
        expect(isVersionNewer(version, version)).toBe(false);
        expect(isVersionNewer(`v${version}`, version)).toBe(false);
      })
    );
  });

  it("is antisymmetric for comparable versions", () => {
    fc.assert(
      fc.property(semverArb, semverArb, (a, b) => {
        const newerAB = isVersionNewer(a, b);
        const newerBA = isVersionNewer(b, a);
        if (a === b) {
          expect(newerAB).toBe(false);
          expect(newerBA).toBe(false);
        } else {
          expect(newerAB && newerBA).toBe(false);
        }
      })
    );
  });

  it("matches lexicographic major/minor/patch ordering", () => {
    fc.assert(
      fc.property(semverArb, semverArb, (a, b) => {
        const pa = parseSemver(a);
        const pb = parseSemver(b);
        if (!pa || !pb) return true;

        const manual =
          pa[0] > pb[0] ||
          (pa[0] === pb[0] && pa[1] > pb[1]) ||
          (pa[0] === pb[0] && pa[1] === pb[1] && pa[2] > pb[2]);

        return isVersionNewer(a, b) === manual;
      })
    );
  });
});
