/**
 * Download each latest.json installer and verify minisign signatures cryptographically.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyMinisignArtifact } from "./minisign-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const repo = process.env.GITHUB_REPOSITORY ?? "rattaroaz/PaintContractor";
const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
const expectedPlatforms = (process.env.EXPECT_PLATFORMS ?? "windows-x86_64,windows-x86_64-nsis")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!tag) {
  console.error("RELEASE_TAG or GITHUB_REF_NAME must be set.");
  process.exit(1);
}

function encodeReleaseAssetUrl(repo, tag, assetPath) {
  const encodedName = assetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://github.com/${repo}/releases/download/${tag}/${encodedName}`;
}

function buildUrlCandidates(entryUrl) {
  const urlCandidates = [entryUrl];
  try {
    const parsed = new URL(entryUrl);
    const rawName = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    const dottedName = rawName.replace(/ /g, ".");
    if (dottedName !== rawName) {
      urlCandidates.push(encodeReleaseAssetUrl(repo, tag, dottedName));
    }
  } catch {
    // keep original url only
  }
  return urlCandidates;
}

async function downloadInstaller(entryUrl) {
  const urlCandidates = buildUrlCandidates(entryUrl);
  let lastStatus = 0;
  for (const candidate of urlCandidates) {
    const assetRes = await fetch(candidate, { cache: "no-store" });
    if (assetRes.ok) {
      if (candidate !== entryUrl) {
        console.warn(
          `Live URL differs from latest.json; downloaded asset from ${candidate}`
        );
      }
      return {
        ok: true,
        bytes: Buffer.from(await assetRes.arrayBuffer()),
        url: candidate,
      };
    }
    lastStatus = assetRes.status;
  }
  return {
    ok: false,
    error: `Failed to download asset (${lastStatus}). Tried: ${urlCandidates.join(" | ")}`,
  };
}

const conf = JSON.parse(
  readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8")
);
const pubContent = conf?.plugins?.updater?.pubkey?.trim();
if (!pubContent) {
  console.error("plugins.updater.pubkey is missing in tauri.conf.json.");
  process.exit(1);
}

const latestUrl = `https://github.com/${repo}/releases/download/${tag}/latest.json`;
const response = await fetch(latestUrl, { cache: "no-store" });
if (!response.ok) {
  console.error(`Failed to fetch latest.json (${response.status}) from ${latestUrl}`);
  process.exit(1);
}

const latest = await response.json();
console.log(`Checking ${tag} (pub_date ${latest.pub_date ?? "unknown"})`);

let failed = false;
for (const platform of expectedPlatforms) {
  const entry = latest.platforms?.[platform];
  if (!entry?.url || !entry?.signature) {
    console.error(`latest.json platform ${platform} is missing url or signature.`);
    failed = true;
    continue;
  }

  const download = await downloadInstaller(entry.url);
  if (!download.ok) {
    console.error(`${platform}: ${download.error}`);
    failed = true;
    continue;
  }

  const result = await verifyMinisignArtifact(
    download.bytes,
    entry.signature,
    pubContent
  );
  if (result.ok) {
    console.log(`${platform}: signature OK (${download.bytes.length} bytes)`);
  } else {
    console.error(`${platform}: ${result.reason} — ${download.url}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Release signatures OK for ${tag}: ${expectedPlatforms.join(", ")}`);
