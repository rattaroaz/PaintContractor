import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, SMOKE_ROUTES } from "../../src/routeMetadata";

describe("route metadata", () => {
  it("does not define duplicate sidebar paths", () => {
    const paths = NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.to)
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("smoke-tests every sidebar destination", () => {
    const smokePaths = new Set(SMOKE_ROUTES.map((route) => route.path));
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        expect(smokePaths.has(item.to), `missing smoke route for ${item.to}`).toBe(
          true
        );
      }
    }
  });
});
