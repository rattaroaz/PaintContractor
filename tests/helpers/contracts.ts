/**
 * Runtime Zod schemas mirroring the Rust models. These are the source of truth
 * for contract tests: every payload exchanged with the Rust backend (via
 * `invoke`) MUST parse against the matching schema here, otherwise the
 * TypeScript and Rust definitions have drifted apart.
 */
import { z } from "zod";

export const operationResult = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: data.optional(),
  });

export const myCompanyInfoSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  zip: z.string(),
  license_number: z.string(),
});

export const propertySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  gate_code: z.string().nullable().optional(),
  garage_remote_code: z.string().nullable().optional(),
  lock_box: z.string().nullable().optional(),
  special_note: z.string().nullable().optional(),
  manager_name: z.string().nullable().optional(),
  manager_phone: z.string().nullable().optional(),
  manager_email: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  supervisor_id: z.number().int(),
});

export const supervisorSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  company_id: z.number().int(),
  properties: z.array(propertySchema),
});

export const companySchema = z.object({
  id: z.number().int(),
  company_id: z.number().int().min(1000).max(9999),
  name: z.string().min(1),
  owner: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  special_note: z.string().nullable().optional(),
  supervisors: z.array(supervisorSchema),
});

export const contractorSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  license_number: z.string().nullable().optional(),
  social_security_number: z.string().nullable().optional(),
  contractor_id: z.string().nullable().optional(),
  payroll_percent: z.string().nullable().optional(),
  cell_phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  special_note: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
});

export const jobDescriptionSchema = z.object({
  id: z.number().int(),
  description: z.string(),
  size_bedroom: z.number().int().nonnegative(),
  size_bathroom: z.number().int().nonnegative(),
  price: z.number().int().nonnegative(),
});

export const invoiceSchema = z
  .object({
    id: z.number().int(),
    todays_date: z.string(),
    work_date: z.string(),
    company_name: z.string(),
    property_address: z.string(),
    unit: z.string(),
    gate_code: z.string().nullable().optional(),
    lock_box: z.string().nullable().optional(),
    size_bedroom: z.number().int().min(0).max(20),
    size_bathroom: z.number().int().min(0).max(20),
    work_order: z.string().nullable().optional(),
    job_description_choice: z.string(),
    contractor_name: z.string(),
    amount_cost: z.number().int().nonnegative(),
    amount_paid1: z.number().int().nonnegative(),
    date_paid1: z.string().nullable().optional(),
    check_number1: z.string().nullable().optional(),
    amount_paid2: z.number().int().nonnegative(),
    date_paid2: z.string().nullable().optional(),
    check_number2: z.string().nullable().optional(),
    invoice_created_date: z.string().nullable().optional(),
    special_note: z.string().nullable().optional(),
    garage_remote_code: z.string().nullable().optional(),
    status: z.number().int().min(0).max(2),
  })
  .refine((i) => i.amount_paid1 + i.amount_paid2 <= i.amount_cost, {
    message: "Combined paid amount cannot be greater than amount cost.",
  });

export const updateSettingsSchema = z.object({
  repository_owner: z.string(),
  repository_name: z.string(),
  check_on_startup: z.boolean(),
  enabled: z.boolean(),
  last_check: z.string().nullable().optional(),
});

export const loggingPathsSchema = z.object({
  database_path: z.string(),
  log_directory: z.string(),
});

export const appLogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  message: z.string(),
});
