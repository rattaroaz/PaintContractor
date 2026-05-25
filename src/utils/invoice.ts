import type { Invoice, JobDescription } from "../types";
import { findJobByKey, priceForJobKey } from "./jobs";

export enum InvoiceStatus {
  Draft = 0,
  Submitted = 1,
  Paid = 2,
}

export const VIEW_ALL = "View All";

/**
 * Sum catalog prices for each selected job name using the invoice's bedroom/bathroom counts.
 */
export function calcAmountFromJobs(
  jobDescriptionChoice: string,
  jobs: JobDescription[],
  sizeBedroom: number,
  sizeBathroom: number
): number {
  const names = jobNamesFromChoice(jobDescriptionChoice);
  return names
    .map((n) => priceForJobKey(jobs, n, sizeBedroom, sizeBathroom))
    .reduce((sum, p) => sum + p, 0);
}

export function resolveJobDescriptions(
  json: string,
  jobs: JobDescription[],
  sizeBedroom: number,
  sizeBathroom: number
): JobDescription[] {
  const names = jobNamesFromChoice(json);
  return names
    .map((n) => findJobByKey(jobs, n, sizeBedroom, sizeBathroom))
    .filter((j): j is JobDescription => !!j);
}

export function jobNamesFromChoice(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "description" in item) {
          return String((item as { description: string }).description);
        }
        return "";
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function buildJobDescriptionChoice(names: string[]): string {
  return JSON.stringify(names.filter(Boolean));
}

export function balanceDue(inv: Invoice): number {
  return inv.amount_cost - inv.amount_paid1 - inv.amount_paid2;
}

export function isReceivable(inv: Invoice): boolean {
  return inv.amount_cost > inv.amount_paid1 + inv.amount_paid2;
}

export function filterByCompany(
  invoices: Invoice[],
  company: string
): Invoice[] {
  if (!company || company === VIEW_ALL) return invoices;
  return invoices.filter((i) => i.company_name === company);
}

export function filterByAddress(
  invoices: Invoice[],
  address: string
): Invoice[] {
  if (!address || address === VIEW_ALL) return invoices;
  return invoices.filter((i) => i.property_address === address);
}

export function filterByDateRange(
  invoices: Invoice[],
  start?: string,
  end?: string
): Invoice[] {
  if (!start && !end) return invoices;
  return invoices.filter((i) => {
    if (start && i.work_date < start) return false;
    if (end && i.work_date > end) return false;
    return true;
  });
}

export function filterByWorkDate(
  invoices: Invoice[],
  date: string
): Invoice[] {
  if (!date) return invoices;
  return invoices.filter((i) => i.work_date === date);
}

export function filterByContractor(
  invoices: Invoice[],
  contractor: string
): Invoice[] {
  if (!contractor || contractor === VIEW_ALL) return invoices;
  return invoices.filter((i) => i.contractor_name === contractor);
}

export function buildCompanyNames(invoices: Invoice[]): string[] {
  const names = new Set(invoices.map((i) => i.company_name).filter(Boolean));
  return [VIEW_ALL, ...Array.from(names).sort()];
}

export function buildAddresses(invoices: Invoice[]): string[] {
  const addrs = new Set(
    invoices.map((i) => i.property_address).filter(Boolean)
  );
  return [VIEW_ALL, ...Array.from(addrs).sort()];
}

export function recalcInvoiceAmount(
  invoice: Invoice,
  jobs: JobDescription[]
): Invoice {
  return {
    ...invoice,
    amount_cost: calcAmountFromJobs(
      invoice.job_description_choice,
      jobs,
      invoice.size_bedroom,
      invoice.size_bathroom
    ),
  };
}

export interface ExInvoice extends Invoice {
  days_overdue: number;
}

export function toExInvoice(inv: Invoice): ExInvoice {
  const base = inv.invoice_created_date ?? todayForOverdue();
  const created = new Date(base + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );
  return { ...inv, days_overdue: Math.max(0, diff) };
}

function todayForOverdue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function invoiceToExportRow(
  inv: Invoice,
  formatNumber: (id: number) => string,
  formatDateFn: (d: string) => string
): Record<string, string | number> {
  return {
    "Invoice Number": formatNumber(inv.id),
    "Work Date": formatDateFn(inv.work_date),
    "Company": inv.company_name,
    "Property Address": inv.property_address,
    Unit: inv.unit,
    "Amount Cost": inv.amount_cost,
    "Amount Paid 1": inv.amount_paid1,
    "Date Paid 1": inv.date_paid1 ? formatDateFn(inv.date_paid1) : "",
    "Check 1": inv.check_number1 ?? "",
    "Amount Paid 2": inv.amount_paid2,
    "Date Paid 2": inv.date_paid2 ? formatDateFn(inv.date_paid2) : "",
    "Check 2": inv.check_number2 ?? "",
    Contractor: inv.contractor_name,
    "Job Description": inv.job_description_choice,
    "Special Note": inv.special_note ?? "",
  };
}
