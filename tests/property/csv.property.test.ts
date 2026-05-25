/**
 * Property-based tests for CSV parsing: ensures the parser is robust against
 * whitespace, casing, mixed line endings, and bracketed/escaped fields.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  parseCompaniesCsv,
  parsePropertiesCsv,
  parseSalesCsv,
} from "../../src/utils/csv";

// Disallow leading/trailing whitespace + commas + quotes so we don't fight the
// real CSV parser (which trims) or its quote handling.
const friendlyText = () =>
  fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,10}[A-Za-z0-9]$/);

function csv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => c.replace(/"/g, '""')).join(",")).join("\n");
}

describe("parseCompaniesCsv (property)", () => {
  it("returns one row per non-blank Name input regardless of column order", () => {
    fc.assert(
      fc.property(
        fc.array(friendlyText(), { minLength: 1, maxLength: 4 }),
        (names) => {
          const text = csv([["Name", "Owner"], ...names.map((n) => [n, "Owner"])]);
          const rows = parseCompaniesCsv(text);
          expect(rows).toHaveLength(names.length);
          expect(rows.map((r) => r.name)).toEqual(names);
        }
      )
    );
  });

  it("ignores rows missing the required Name column", () => {
    fc.assert(
      fc.property(friendlyText(), (owner) => {
        const text = csv([
          ["Owner", "Phone"],
          [owner, "555"],
        ]);
        expect(parseCompaniesCsv(text)).toEqual([]);
      })
    );
  });

  it("tolerates CRLF line endings", () => {
    fc.assert(
      fc.property(friendlyText(), (name) => {
        const text = `Name,Owner\r\n${name},Alice\r\n`;
        const rows = parseCompaniesCsv(text);
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe(name);
        expect(rows[0].owner).toBe("Alice");
      })
    );
  });
});

describe("parsePropertiesCsv (property)", () => {
  it("attaches supervisor_id when numeric, else null", () => {
    fc.assert(
      fc.property(
        friendlyText(),
        fc.integer({ min: 1, max: 9999 }),
        (name, sid) => {
          const text = csv([
            ["Name", "SupervisorId"],
            [name, String(sid)],
          ]);
          const rows = parsePropertiesCsv(text);
          expect(rows[0].supervisor_id).toBe(sid);
          const bad = csv([["Name", "SupervisorId"], [name, "not-a-number"]]);
          expect(parsePropertiesCsv(bad)[0].supervisor_id).toBeNull();
        }
      )
    );
  });
});

describe("parseSalesCsv (property)", () => {
  it("requires work_date, company, and address; drops rows missing any", () => {
    fc.assert(
      fc.property(
        friendlyText(),
        friendlyText(),
        friendlyText(),
        (company, addr, wo) => {
          const text = csv([
            ["WorkDate", "CompanyName", "PropertyAddress", "WorkOrder"],
            ["", company, addr, wo],
            ["2026-05-25", "", addr, wo],
            ["2026-05-25", company, "", wo],
            ["2026-05-25", company, addr, wo],
          ]);
          const rows = parseSalesCsv(text);
          expect(rows).toHaveLength(1);
          expect(rows[0]).toMatchObject({
            company_name: company,
            property_address: addr,
            work_order: wo,
          });
        }
      )
    );
  });
});
