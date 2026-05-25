import type { JobDescription } from "../types";

/** Match catalog row by description + bedroom + bathroom counts. */
export function findJobByKey(
  jobs: JobDescription[],
  description: string,
  sizeBedroom: number,
  sizeBathroom: number
): JobDescription | undefined {
  const desc = description.trim();
  return jobs.find(
    (j) =>
      j.description.trim() === desc &&
      j.size_bedroom === sizeBedroom &&
      j.size_bathroom === sizeBathroom
  );
}

export function priceForJobKey(
  jobs: JobDescription[],
  description: string,
  sizeBedroom: number,
  sizeBathroom: number
): number {
  return findJobByKey(jobs, description, sizeBedroom, sizeBathroom)?.price ?? 0;
}

/** Distinct job description labels for dropdowns. */
export function uniqueJobDescriptions(jobs: JobDescription[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const j of jobs) {
    const d = j.description.trim();
    if (d && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function jobRowKey(
  description: string,
  sizeBedroom: number,
  sizeBathroom: number
): string {
  return `${description.trim()}|${sizeBedroom}|${sizeBathroom}`;
}

export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase();
}

/** One grid row per unique job description; default bed/bath is the lowest saved combo. */
export function oneRowPerDescription(jobs: JobDescription[]): JobDescription[] {
  const byDesc = new Map<string, JobDescription>();
  for (const j of jobs) {
    const key = normalizeDescription(j.description);
    if (!key) continue;
    const existing = byDesc.get(key);
    if (!existing) {
      byDesc.set(key, j);
      continue;
    }
    if (
      j.size_bedroom < existing.size_bedroom ||
      (j.size_bedroom === existing.size_bedroom &&
        j.size_bathroom < existing.size_bathroom)
    ) {
      byDesc.set(key, j);
    }
  }
  return Array.from(byDesc.values()).sort((a, b) =>
    a.description.localeCompare(b.description)
  );
}

export function isDuplicateDescription(
  description: string,
  rows: { description: string }[],
  excludeIndex: number
): boolean {
  const key = normalizeDescription(description);
  if (!key) return false;
  return rows.some(
    (r, i) =>
      i !== excludeIndex && normalizeDescription(r.description) === key
  );
}
