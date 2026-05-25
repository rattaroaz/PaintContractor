/**
 * Browser-side Tauri IPC mock used by Playwright E2E + smoke runs.
 *
 * When the Vite dev server is started with `VITE_TAURI_MOCK=1` we install a
 * synchronous in-memory backend on `window.__TAURI_INTERNALS__.invoke`. The
 * shape mirrors the Rust commands exposed in `src-tauri/src/lib.rs`, so the
 * real production frontend can execute against fully scripted state without
 * needing a running Tauri runtime.
 *
 * Tests can also register additional or override handlers via
 * `window.__installMockHandler__(cmd, fn)`.
 */

import type {
  Company,
  Contractor,
  Invoice,
  JobDescription,
  MyCompanyInfo,
  OperationResult,
} from "../types";

type Handler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

interface Stores {
  myCompany: MyCompanyInfo;
  companies: Company[];
  contractors: Contractor[];
  jobs: JobDescription[];
  invoices: Invoice[];
}

const stores: Stores = {
  myCompany: {
    id: 1,
    name: "DKSK Painting",
    phone: "808-555-0100",
    email: "ops@dksk.example",
    address: "1 Paint Way",
    zip: "96720",
    license_number: "LIC-001",
  },
  companies: [
    {
      id: 1,
      company_id: 1001,
      name: "Acme Properties",
      owner: "Jane Doe",
      phone: "808-555-1111",
      email: "ops@acme.example",
      address: "1 Main St",
      city: "Hilo",
      zip: "96720",
      special_note: null,
      supervisors: [],
    },
  ],
  contractors: [
    {
      id: 1,
      name: "Alex Painter",
      license_number: "C-1",
      social_security_number: null,
      contractor_id: "AP-001",
      payroll_percent: "10",
      cell_phone: "808-555-9999",
      email: null,
      address: null,
      city: null,
      zip: null,
      special_note: null,
      is_active: true,
    },
  ],
  jobs: [
    { id: 1, description: "Interior Paint", size_bedroom: 1, size_bathroom: 1, price: 50 },
    { id: 2, description: "Interior Paint", size_bedroom: 2, size_bathroom: 2, price: 120 },
    { id: 3, description: "Trim Work", size_bedroom: 2, size_bathroom: 2, price: 40 },
  ],
  invoices: [],
};

const handlers = new Map<string, Handler>();

function ok<T>(data: T, message = ""): OperationResult<T> {
  return { success: true, message, data };
}

function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}

function registerDefaults(): void {
  handlers.set("get_database_path", async () => "(mock)/app.db");
  handlers.set("get_logging_paths", async () => ({
    database_path: "(mock)/app.db",
    log_directory: "(mock)/logs",
  }));
  handlers.set("log_frontend", async () => null);
  handlers.set("get_app_version", async () => "1.0.0-mock");

  handlers.set("get_my_company_info", async () => stores.myCompany);
  handlers.set("save_my_company_info", async (args) => {
    stores.myCompany = (args as { info: MyCompanyInfo }).info;
    return ok(stores.myCompany);
  });

  handlers.set("get_all_companies", async () => stores.companies);
  handlers.set("get_next_company_id", async () => {
    for (let id = 1000; id <= 9999; id++) {
      if (!stores.companies.some((c) => c.company_id === id)) return id;
    }
    throw new Error("No CompanyID available");
  });
  handlers.set("save_company", async (args) => {
    const c = (args as { company: Company }).company;
    if (
      stores.companies.some(
        (existing) =>
          existing.id !== c.id &&
          existing.name.toLowerCase() === c.name.toLowerCase()
      )
    ) {
      return { success: false, message: "Company with this name already exists" };
    }
    if (c.id === 0) {
      const saved: Company = { ...c, id: nextId(stores.companies) };
      stores.companies.push(saved);
      return ok(saved);
    }
    stores.companies = stores.companies.map((existing) =>
      existing.id === c.id ? c : existing
    );
    return ok(c);
  });
  handlers.set("delete_company", async (args) => {
    const id = (args as { companyId: number }).companyId;
    stores.companies = stores.companies.filter((c) => c.id !== id);
    return ok(undefined);
  });

  handlers.set("get_all_contractors", async () => stores.contractors);
  handlers.set("save_contractor", async (args) => {
    const c = (args as { contractor: Contractor }).contractor;
    if (c.id === 0) {
      const saved: Contractor = { ...c, id: nextId(stores.contractors) };
      stores.contractors.push(saved);
      return ok(saved);
    }
    stores.contractors = stores.contractors.map((existing) =>
      existing.id === c.id ? c : existing
    );
    return ok(c);
  });
  handlers.set("delete_contractor", async (args) => {
    const id = (args as { id: number }).id;
    stores.contractors = stores.contractors.filter((c) => c.id !== id);
    return ok(undefined);
  });

  handlers.set("get_all_jobs", async () => stores.jobs);
  handlers.set("find_job_by_key", async (args) => {
    const { description, sizeBedroom, sizeBathroom } = args as {
      description: string;
      sizeBedroom: number;
      sizeBathroom: number;
    };
    return (
      stores.jobs.find(
        (j) =>
          j.description.trim() === description.trim() &&
          j.size_bedroom === sizeBedroom &&
          j.size_bathroom === sizeBathroom
      ) ?? null
    );
  });
  handlers.set("upsert_job", async (args) => {
    const job = (args as { job: JobDescription }).job;
    const existing = stores.jobs.find(
      (j) =>
        j.description.trim() === job.description.trim() &&
        j.size_bedroom === job.size_bedroom &&
        j.size_bathroom === job.size_bathroom
    );
    if (existing) {
      existing.price = job.price;
      return ok(existing);
    }
    const saved = { ...job, id: nextId(stores.jobs) };
    stores.jobs.push(saved);
    return ok(saved);
  });
  handlers.set("delete_job", async (args) => {
    const id = (args as { id: number }).id;
    stores.jobs = stores.jobs.filter((j) => j.id !== id);
    return ok(undefined);
  });
  handlers.set("delete_jobs_by_description", async (args) => {
    const desc = (args as { description: string }).description.trim();
    const before = stores.jobs.length;
    stores.jobs = stores.jobs.filter((j) => j.description.trim() !== desc);
    return ok(before - stores.jobs.length, `Removed ${before - stores.jobs.length} job(s)`);
  });

  handlers.set("get_all_invoices", async () => stores.invoices);
  handlers.set("get_invoices_active", async () =>
    stores.invoices.filter((i) => i.status === 0)
  );
  handlers.set("get_invoices_sales", async () =>
    stores.invoices.filter((i) => i.status >= 1)
  );
  handlers.set("get_invoices_receivable", async () =>
    stores.invoices.filter(
      (i) => i.amount_cost > i.amount_paid1 + i.amount_paid2 && i.status >= 1
    )
  );
  handlers.set("add_invoice", async (args) => {
    const inv = (args as { invoice: Invoice }).invoice;
    const saved = { ...inv, id: nextId(stores.invoices) };
    stores.invoices.push(saved);
    return ok(saved);
  });
  handlers.set("update_invoice", async (args) => {
    const inv = (args as { invoice: Invoice }).invoice;
    stores.invoices = stores.invoices.map((existing) =>
      existing.id === inv.id ? inv : existing
    );
    return ok(inv);
  });
  handlers.set("delete_invoice", async (args) => {
    const id = (args as { id: number }).id;
    stores.invoices = stores.invoices.filter((i) => i.id !== id);
    return ok(undefined);
  });
  handlers.set("apply_receivable_payments", async (args) => {
    const updates = (args as { invoices: Invoice[] }).invoices;
    let updated = 0;
    let fullyPaid = 0;
    for (const u of updates) {
      if (u.amount_paid1 + u.amount_paid2 > u.amount_cost) {
        return { success: false, message: "The paid amount can not be greater than amount due!" };
      }
    }
    stores.invoices = stores.invoices.map((existing) => {
      const u = updates.find((x) => x.id === existing.id);
      if (!u) return existing;
      updated++;
      if (u.amount_paid1 + u.amount_paid2 >= u.amount_cost) fullyPaid++;
      return { ...existing, ...u };
    });
    return ok(
      `Updated ${updated} invoice(s). ${fullyPaid} fully paid.`,
      `Updated ${updated} invoice(s). ${fullyPaid} fully paid.`
    );
  });

  handlers.set("get_invoices_by_date_range", async (args) => {
    const { start, end } = args as { start: string; end: string };
    return stores.invoices.filter(
      (i) => i.status === 0 && i.work_date >= start && i.work_date <= end
    );
  });

  handlers.set("ensure_company_by_name", async (args) => {
    const name = String((args as { name: string }).name).trim();
    if (!name) return { success: false, message: "Company name is required." };
    const found = stores.companies.find((c) => c.name.trim() === name);
    if (found) return ok(found);
    const cid =
      stores.companies.reduce((m, c) => Math.max(m, c.company_id), 999) + 1;
    const created: Company = {
      id: nextId(stores.companies),
      company_id: cid,
      name,
      owner: null,
      phone: null,
      email: null,
      address: null,
      city: null,
      zip: null,
      special_note: null,
      supervisors: [],
    };
    stores.companies.push(created);
    return ok(created);
  });

  handlers.set("get_company_property_addresses", async (args) => {
    const name = (args as { companyName: string }).companyName;
    const found = stores.companies.find((c) => c.name === name);
    if (!found) return [];
    const out: Array<[string, unknown]> = [];
    for (const s of found.supervisors ?? []) {
      for (const p of s.properties ?? []) {
        if (p.address) out.push([p.address, p]);
      }
    }
    return out;
  });

  handlers.set("delete_supervisor", async () => undefined);
  handlers.set("delete_property", async () => undefined);
  handlers.set("replace_all_jobs", async () => ok(undefined));
  handlers.set("import_companies_csv", async (args) => {
    const rows = (args as { rows: { name: string }[] }).rows;
    const added: string[] = [];
    for (const r of rows) {
      const name = (r.name ?? "").trim();
      if (!name || stores.companies.some((c) => c.name === name)) continue;
      added.push(name);
      const cid =
        stores.companies.reduce((m, c) => Math.max(m, c.company_id), 999) + 1;
      stores.companies.push({
        id: nextId(stores.companies),
        company_id: cid,
        name,
        owner: null,
        phone: null,
        email: null,
        address: null,
        city: null,
        zip: null,
        special_note: null,
        supervisors: [],
      });
    }
    return ok(added.length, `Imported ${added.length} companies.`);
  });
  handlers.set("import_properties_csv", async () => ok(0, "Imported 0."));
  handlers.set("import_sales_csv", async () => ok(0, "Imported 0."));
  handlers.set("create_database_backup", async () => [83, 81, 76, 105, 116, 101]);
  handlers.set("restore_database_file", async () => undefined);

  handlers.set("plugin:dialog|ask", async () => true);
  handlers.set("plugin:dialog|confirm", async () => true);
  handlers.set("plugin:dialog|message", async () => null);
  handlers.set("plugin:dialog|save", async () => "(mock)/saved.bin");
  handlers.set("plugin:dialog|open", async () => null);
  handlers.set("plugin:fs|write_file", async () => null);
  handlers.set("plugin:fs|read_file", async () => []);
}

registerDefaults();

(window as unknown as { isTauri: boolean }).isTauri = true;
let cbId = 0;
(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
  invoke: async (cmd: string, rawArgs: unknown) => {
    const args =
      rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
        ? (rawArgs as Record<string, unknown>)
        : { value: rawArgs };
    const handler = handlers.get(cmd);
    if (!handler) {
      console.warn(`[tauri-mock] no handler for ${cmd}`, args);
      return undefined;
    }
    return handler(args);
  },
  transformCallback: () => ++cbId,
};

(window as unknown as Record<string, unknown>).__installMockHandler__ = (
  cmd: string,
  fn: Handler
) => {
  handlers.set(cmd, fn);
};

(window as unknown as Record<string, unknown>).__mockStores__ = stores;

export {};
