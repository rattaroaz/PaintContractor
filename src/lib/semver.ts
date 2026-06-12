export function parseSemver(version: string): [number, number, number] | null {
  const core = version.trim().replace(/^[vV]/, "").split(/[-+]/)[0];
  const parts = core.split(".");
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n))) return null;

  const major = nums[0];
  const minor = nums[1];
  const patch = nums[2] ?? 0;
  return [major, minor, patch];
}

export function isVersionNewer(candidate: string, installed: string): boolean {
  const a = parseSemver(candidate);
  const b = parseSemver(installed);
  if (!a || !b) return false;

  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}
