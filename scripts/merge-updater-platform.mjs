import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tag = process.env.RELEASE_TAG;
const repo = process.env.GITHUB_REPOSITORY;
const rustTarget = process.env.RUST_TARGET ?? "aarch64-pc-windows-msvc";
const platformKey = process.env.PLATFORM_KEY ?? "windows-aarch64";

if (!tag || !repo) {
  console.error("RELEASE_TAG and GITHUB_REPOSITORY must be set.");
  process.exit(1);
}

const bundleDir = path.join("src-tauri", "target", rustTarget, "release", "bundle", "nsis");
const files = readdirSync(bundleDir);
const setupFile = files.find((name) => name.endsWith("-setup.exe") && !name.endsWith(".sig"));
const sigFile = files.find((name) => name.endsWith("-setup.exe.sig"));

if (!setupFile || !sigFile) {
  console.error(`No NSIS setup artifacts found in ${bundleDir}`);
  process.exit(1);
}

const signature = readFileSync(path.join(bundleDir, sigFile), "utf8").trim();
const url = `https://github.com/${repo}/releases/download/${tag}/${setupFile}`;
const latestUrl = `https://github.com/${repo}/releases/download/${tag}/latest.json`;

const response = await fetch(latestUrl);
if (!response.ok) {
  console.error(`Failed to fetch latest.json (${response.status}) from ${latestUrl}`);
  process.exit(1);
}

const latest = await response.json();
const entry = { signature, url };
latest.platforms[platformKey] = entry;
latest.platforms[`${platformKey}-nsis`] = entry;

writeFileSync("latest.json", `${JSON.stringify(latest, null, 2)}\n`);

const upload = spawnSync("gh", ["release", "upload", tag, "latest.json", "--clobber"], {
  stdio: "inherit",
});

if (upload.status !== 0) {
  process.exit(upload.status ?? 1);
}

console.log(`Updated latest.json with ${platformKey} and ${platformKey}-nsis`);
