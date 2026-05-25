import { api } from "../api";
import type { Company } from "../types";

export async function fetchNextCompanyId(): Promise<number> {
  try {
    return await api.getNextCompanyId();
  } catch {
    return 1000;
  }
}

export async function emptyCompanyForm(): Promise<Company> {
  const company_id = await fetchNextCompanyId();
  return {
    id: 0,
    company_id,
    name: "",
    owner: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    zip: null,
    special_note: null,
    supervisors: [],
  };
}
