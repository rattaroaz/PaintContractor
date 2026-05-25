import type { CsvCompanyRow, CsvPropertyRow, CsvSalesRow } from "../types";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvText(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }
  return rows;
}

function headerIndex(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, ""));
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase().replace(/\s+/g, ""));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: string[], idx: number): string | undefined {
  if (idx < 0 || idx >= row.length) return undefined;
  const v = row[idx]?.trim();
  return v || undefined;
}

function optNum(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function parseCompaniesCsv(text: string): CsvCompanyRow[] {
  const rows = parseCsvText(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const nameIdx = headerIndex(headers, ["Name", "CompanyName"]);
  if (nameIdx < 0) return [];
  const ownerIdx = headerIndex(headers, ["Owner"]);
  const phoneIdx = headerIndex(headers, ["Phone"]);
  const emailIdx = headerIndex(headers, ["Email"]);
  const addressIdx = headerIndex(headers, ["Address"]);
  const cityIdx = headerIndex(headers, ["City"]);
  const zipIdx = headerIndex(headers, ["Zip"]);
  const noteIdx = headerIndex(headers, ["SpecialNote", "Note"]);

  return rows.slice(1).map((row) => ({
    name: cell(row, nameIdx) ?? "",
    owner: cell(row, ownerIdx) ?? null,
    phone: cell(row, phoneIdx) ?? null,
    email: cell(row, emailIdx) ?? null,
    address: cell(row, addressIdx) ?? null,
    city: cell(row, cityIdx) ?? null,
    zip: cell(row, zipIdx) ?? null,
    special_note: cell(row, noteIdx) ?? null,
  })).filter((r) => r.name.trim());
}

export function parsePropertiesCsv(text: string): CsvPropertyRow[] {
  const rows = parseCsvText(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const nameIdx = headerIndex(headers, ["Name"]);
  const supNameIdx = headerIndex(headers, ["SupervisorName", "Supervisor"]);
  const supIdIdx = headerIndex(headers, ["SupervisorId"]);
  const addressIdx = headerIndex(headers, ["Address"]);
  const cityIdx = headerIndex(headers, ["City"]);
  const zipIdx = headerIndex(headers, ["Zip"]);
  const gateIdx = headerIndex(headers, ["GateCode"]);
  const garageIdx = headerIndex(headers, ["GarageRemoteCode"]);
  const mgrNameIdx = headerIndex(headers, ["ManagerName"]);
  const mgrPhoneIdx = headerIndex(headers, ["ManagerPhone"]);
  const mgrEmailIdx = headerIndex(headers, ["ManagerEmail"]);
  const lockIdx = headerIndex(headers, ["LockBox"]);
  const noteIdx = headerIndex(headers, ["SpecialNote", "Note"]);

  return rows.slice(1).map((row) => ({
    name: cell(row, nameIdx) ?? "",
    supervisor_name: cell(row, supNameIdx) ?? null,
    supervisor_id: optNum(cell(row, supIdIdx)) ?? null,
    address: cell(row, addressIdx) ?? null,
    city: cell(row, cityIdx) ?? null,
    zip: cell(row, zipIdx) ?? null,
    gate_code: cell(row, gateIdx) ?? null,
    garage_remote_code: cell(row, garageIdx) ?? null,
    manager_name: cell(row, mgrNameIdx) ?? null,
    manager_phone: cell(row, mgrPhoneIdx) ?? null,
    manager_email: cell(row, mgrEmailIdx) ?? null,
    lock_box: cell(row, lockIdx) ?? null,
    special_note: cell(row, noteIdx) ?? null,
  })).filter((r) => r.name.trim());
}

export function parseSalesCsv(text: string): CsvSalesRow[] {
  const rows = parseCsvText(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const workDateIdx = headerIndex(headers, ["WorkDate"]);
  const companyIdx = headerIndex(headers, ["CompanyName", "Company"]);
  const addressIdx = headerIndex(headers, ["PropertyAddress", "Address"]);
  const unitIdx = headerIndex(headers, ["Unit"]);
  const bedIdx = headerIndex(headers, ["SizeBedroom", "Bedrooms"]);
  const bathIdx = headerIndex(headers, ["SizeBathroom", "Bathrooms"]);
  const woIdx = headerIndex(headers, ["WorkOrder"]);
  const jobIdx = headerIndex(headers, ["JobDescriptionChoice", "JobDescription"]);
  const contractorIdx = headerIndex(headers, ["ContractorName", "Contractor"]);
  const costIdx = headerIndex(headers, ["AmountCost", "Price"]);
  const paid1Idx = headerIndex(headers, ["AmountPaid1"]);
  const date1Idx = headerIndex(headers, ["DatePaid1"]);
  const check1Idx = headerIndex(headers, ["CheckNumber1"]);
  const paid2Idx = headerIndex(headers, ["AmountPaid2"]);
  const date2Idx = headerIndex(headers, ["DatePaid2"]);
  const check2Idx = headerIndex(headers, ["CheckNumber2"]);
  const noteIdx = headerIndex(headers, ["SpecialNote"]);
  const gateIdx = headerIndex(headers, ["GateCode"]);
  const lockIdx = headerIndex(headers, ["LockBox"]);
  const garageIdx = headerIndex(headers, ["GarageRemoteCode"]);

  return rows.slice(1).map((row) => ({
    work_date: cell(row, workDateIdx) ?? "",
    company_name: cell(row, companyIdx) ?? "",
    property_address: cell(row, addressIdx) ?? "",
    unit: cell(row, unitIdx) ?? null,
    size_bedroom: optNum(cell(row, bedIdx)) ?? null,
    size_bathroom: optNum(cell(row, bathIdx)) ?? null,
    work_order: cell(row, woIdx) ?? null,
    job_description_choice: cell(row, jobIdx) ?? null,
    contractor_name: cell(row, contractorIdx) ?? null,
    amount_cost: optNum(cell(row, costIdx)) ?? null,
    amount_paid1: optNum(cell(row, paid1Idx)) ?? null,
    date_paid1: cell(row, date1Idx) ?? null,
    check_number1: cell(row, check1Idx) ?? null,
    amount_paid2: optNum(cell(row, paid2Idx)) ?? null,
    date_paid2: cell(row, date2Idx) ?? null,
    check_number2: cell(row, check2Idx) ?? null,
    special_note: cell(row, noteIdx) ?? null,
    gate_code: cell(row, gateIdx) ?? null,
    lock_box: cell(row, lockIdx) ?? null,
    garage_remote_code: cell(row, garageIdx) ?? null,
  })).filter(
    (r) => r.work_date && r.company_name && r.property_address
  );
}

export const CSV_TEMPLATES = {
  companies: "Name,Owner,Phone,Email,Address,City,Zip,SpecialNote\n",
  properties:
    "Name,SupervisorName,Address,City,Zip,GateCode,GarageRemoteCode,ManagerName,ManagerPhone,ManagerEmail,LockBox,SpecialNote\n",
  sales:
    "WorkDate,CompanyName,PropertyAddress,Unit,SizeBedroom,SizeBathroom,WorkOrder,JobDescriptionChoice,ContractorName,AmountCost,AmountPaid1,DatePaid1,CheckNumber1,AmountPaid2,DatePaid2,CheckNumber2,SpecialNote,GateCode,LockBox,GarageRemoteCode\n",
};

export function downloadCsvTemplate(
  template: string,
  filename: string
): void {
  const blob = new Blob([template], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
