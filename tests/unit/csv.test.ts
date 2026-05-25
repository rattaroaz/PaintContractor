import { describe, expect, it } from "vitest";
import {
  CSV_TEMPLATES,
  parseCompaniesCsv,
  parsePropertiesCsv,
  parseSalesCsv,
} from "../../src/utils/csv";

describe("parseCompaniesCsv", () => {
  it("parses headers + values and ignores empty rows", () => {
    const text = `${CSV_TEMPLATES.companies}Acme,Jane,555,jane@a.com,1 Main,Hilo,96720,VIP\n\n`;
    const rows = parseCompaniesCsv(text);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Acme",
      owner: "Jane",
      phone: "555",
      email: "jane@a.com",
      address: "1 Main",
      city: "Hilo",
      zip: "96720",
      special_note: "VIP",
    });
  });

  it("returns [] when the Name column is missing", () => {
    expect(parseCompaniesCsv("Phone\n555\n")).toEqual([]);
  });

  it("handles quoted fields containing commas and escaped quotes", () => {
    const text = `Name\n"Smith, Inc"\n"He said ""hi"""\n`;
    const rows = parseCompaniesCsv(text);
    expect(rows.map((r) => r.name)).toEqual(["Smith, Inc", 'He said "hi"']);
  });
});

describe("parsePropertiesCsv", () => {
  it("links by supervisor name and parses optional fields", () => {
    const text =
      "Name,SupervisorName,Address,GateCode,SpecialNote\n" +
      "Unit A,Pat,1 Main,1234,Friendly\n";
    const rows = parsePropertiesCsv(text);
    expect(rows[0]).toMatchObject({
      name: "Unit A",
      supervisor_name: "Pat",
      address: "1 Main",
      gate_code: "1234",
      special_note: "Friendly",
    });
  });
});

describe("parseSalesCsv", () => {
  it("requires WorkDate + CompanyName + PropertyAddress", () => {
    const text = "WorkDate,CompanyName,PropertyAddress\n,,\n2026-01-01,Acme,1 Main\n";
    const rows = parseSalesCsv(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].work_date).toBe("2026-01-01");
  });

  it("parses numeric columns when present", () => {
    const text =
      "WorkDate,CompanyName,PropertyAddress,SizeBedroom,AmountCost\n" +
      "2026-01-01,Acme,1 Main,3,150\n";
    const rows = parseSalesCsv(text);
    expect(rows[0].size_bedroom).toBe(3);
    expect(rows[0].amount_cost).toBe(150);
  });
});
