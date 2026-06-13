/**
 * Fix latest.json platform URLs when local NSIS names (spaces) differ from
 * GitHub release asset names (dots). Re-uploads latest.json with --clobber.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
const repo = process.env.GITHUB_REPOSITORY ?? "rattaroaz/PaintContractor";

if (!tag) {
  console.error("RELEASE_TAG or GITHUB_REF_NAME must be set.");
  process.exit(1);
}

function normalizeAssetUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const fileName = decodeURIComponent(parts.pop() ?? "");
    const fixedName = fileName.replace(/ /g, ".");
    if (fixedName === fileName) return url;
    parts.push(encodeURIComponent(fixedName).replace(/%2F/g, "/"));
    parsed.pathname = parts.join("/");
    return parsed.toString();
  } catch {
    return url;
  }
}

const latestUrl = `https://github.com/${repo}/releases/download/${tag}/latest.json`;
const response = await fetch(latestUrl, { cache: "no-store" });
if (!response.ok) {
  console.error(`Failed to fetch latest.json (${response.status}) from ${latestUrl}`);
  process.exit(1);
}

const latest = await response.json();
let changed = 0;

for (const [platform, entry] of Object.entries(latest.platforms ?? {})) {
  if (!entry?.url) continue;
  const nextUrl = normalizeAssetUrl(entry.url);
  if (nextUrl !== entry.url) {
    console.log(`${platform}: ${entry.url} -> ${nextUrl}`);
    entry.url = nextUrl;
    changed += 1;
  }
}

if (changed === 0) {
  console.log("No URL fixes needed.");
  process.exit(0);
}

writeFileSync("latest.json", `${JSON.stringify(latest, null, 2)}\n`);

const upload = spawnSync(
  "gh",
  ["release", "upload", tag, "latest.json", "--repo", repo, "--clobber"],
  { stdio: "inherit" }
);

if (upload.status !== 0) {
  process.exit(upload.status ?? 1);
}

console.log(`Repaired ${changed} URL(s) in latest.json for ${tag}.`);
