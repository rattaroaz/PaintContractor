export interface OperationResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
}

export interface MyCompanyInfo {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  zip: string;
  license_number: string;
}

export interface Property {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  gate_code?: string | null;
  garage_remote_code?: string | null;
  lock_box?: string | null;
  special_note?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  manager_email?: string | null;
  is_active?: boolean | null;
  supervisor_id: number;
}

export interface Supervisor {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  company_id: number;
  properties: Property[];
}

export interface Company {
  id: number;
  company_id: number;
  name: string;
  owner?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  special_note?: string | null;
  supervisors: Supervisor[];
}

export interface Contractor {
  id: number;
  name: string;
  license_number?: string | null;
  social_security_number?: string | null;
  contractor_id?: string | null;
  payroll_percent?: string | null;
  cell_phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  special_note?: string | null;
  is_active?: boolean | null;
}

export interface JobDescription {
  id: number;
  description: string;
  size_bedroom: number;
  size_bathroom: number;
  price: number;
}

export interface Invoice {
  id: number;
  todays_date: string;
  work_date: string;
  company_name: string;
  property_address: string;
  unit: string;
  gate_code?: string | null;
  lock_box?: string | null;
  size_bedroom: number;
  size_bathroom: number;
  work_order?: string | null;
  job_description_choice: string;
  contractor_name: string;
  amount_cost: number;
  amount_paid1: number;
  date_paid1?: string | null;
  check_number1?: string | null;
  amount_paid2: number;
  date_paid2?: string | null;
  check_number2?: string | null;
  invoice_created_date?: string | null;
  special_note?: string | null;
  garage_remote_code?: string | null;
  status: number;
}

export interface InvoiceDashboardData {
  invoices: Invoice[];
  company_names: string[];
  addresses: string[];
}

export interface UpdateSettings {
  repository_owner: string;
  repository_name: string;
  check_on_startup: boolean;
  enabled: boolean;
}

export interface GitHubReleaseInfo {
  version: string;
  release_notes: string;
  download_url?: string | null;
  is_update_available: boolean;
}

export interface CsvCompanyRow {
  name: string;
  owner?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  special_note?: string | null;
}

export interface CsvPropertyRow {
  name: string;
  supervisor_name?: string | null;
  supervisor_id?: number | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  gate_code?: string | null;
  garage_remote_code?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  manager_email?: string | null;
  lock_box?: string | null;
  special_note?: string | null;
}

export interface CsvSalesRow {
  work_date: string;
  company_name: string;
  property_address: string;
  unit?: string | null;
  size_bedroom?: number | null;
  size_bathroom?: number | null;
  work_order?: string | null;
  job_description_choice?: string | null;
  contractor_name?: string | null;
  amount_cost?: number | null;
  amount_paid1?: number | null;
  date_paid1?: string | null;
  check_number1?: string | null;
  amount_paid2?: number | null;
  date_paid2?: string | null;
  check_number2?: string | null;
  special_note?: string | null;
  gate_code?: string | null;
  lock_box?: string | null;
  garage_remote_code?: string | null;
}

export type PropertyAddressEntry = [string, Property];

export interface StartJobRequest {
  todays_date: string;
  work_date: string;
  company_name: string;
  property_address: string;
  unit: string;
  size_bedroom: number;
  size_bathroom: number;
  gate_code?: string;
  lock_box?: string;
  garage_remote_code?: string;
  work_order?: string;
  special_note?: string;
  job_types: string[];
}
