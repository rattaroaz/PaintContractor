import type {
  Company,
  Contractor,
  Invoice,
  JobDescription,
  MyCompanyInfo,
  Property,
  Supervisor,
} from "../../src/types";

export function makeMyCompanyInfo(over: Partial<MyCompanyInfo> = {}): MyCompanyInfo {
  return {
    id: 1,
    name: "DKSK Official",
    phone: "555-0100",
    email: "ops@dksk.example",
    address: "1 Paint St",
    zip: "12345",
    license_number: "LIC-001",
    ...over,
  };
}

export function makeProperty(over: Partial<Property> = {}): Property {
  return {
    id: 100,
    name: "Main Unit",
    address: "123 Main St",
    city: "Hilo",
    zip: "96720",
    gate_code: "1234",
    garage_remote_code: null,
    lock_box: "A1B2",
    special_note: null,
    manager_name: null,
    manager_phone: null,
    manager_email: null,
    is_active: true,
    supervisor_id: 10,
    ...over,
  };
}

export function makeSupervisor(over: Partial<Supervisor> = {}): Supervisor {
  return {
    id: 10,
    name: "Pat Supervisor",
    phone: null,
    email: null,
    company_id: 1,
    properties: [makeProperty()],
    ...over,
  };
}

export function makeCompany(over: Partial<Company> = {}): Company {
  return {
    id: 1,
    company_id: 1001,
    name: "Acme Properties",
    owner: "Jane",
    phone: null,
    email: null,
    address: null,
    city: null,
    zip: null,
    special_note: null,
    supervisors: [makeSupervisor()],
    ...over,
  };
}

export function makeContractor(over: Partial<Contractor> = {}): Contractor {
  return {
    id: 1,
    name: "Alex Painter",
    license_number: "C-1",
    social_security_number: null,
    contractor_id: null,
    payroll_percent: "10",
    cell_phone: null,
    email: null,
    address: null,
    city: null,
    zip: null,
    special_note: null,
    is_active: true,
    ...over,
  };
}

export function makeJob(over: Partial<JobDescription> = {}): JobDescription {
  return {
    id: 1,
    description: "Interior paint",
    size_bedroom: 2,
    size_bathroom: 2,
    price: 100,
    ...over,
  };
}

export function makeInvoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 1,
    todays_date: "2026-05-25",
    work_date: "2026-05-20",
    company_name: "Acme Properties",
    property_address: "123 Main St",
    unit: "A",
    gate_code: null,
    lock_box: null,
    size_bedroom: 2,
    size_bathroom: 2,
    work_order: null,
    job_description_choice: JSON.stringify(["Interior paint"]),
    contractor_name: "Alex Painter",
    amount_cost: 100,
    amount_paid1: 0,
    date_paid1: null,
    check_number1: null,
    amount_paid2: 0,
    date_paid2: null,
    check_number2: null,
    invoice_created_date: null,
    special_note: null,
    garage_remote_code: null,
    status: 0,
    ...over,
  };
}
