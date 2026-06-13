import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tag = process.env.RELEASE_TAG;
const repo = process.env.GITHUB_REPOSITORY;
const rustTarget = process.env.RUST_TARGET;
const platformKey = process.env.PLATFORM_KEY ?? "windows-aarch64";

if (!tag || !repo) {
  console.error("RELEASE_TAG and GITHUB_REPOSITORY must be set.");
  process.exit(1);
}

/** tauri-action uploads NSIS assets with dots instead of spaces in the product name. */
function toReleaseAssetName(localFileName) {
  return localFileName.replace(/ /g, ".");
}

function encodeReleaseAssetUrl(releaseFileName) {
  const encodedName = releaseFileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://github.com/${repo}/releases/download/${tag}/${encodedName}`;
}

function resolveBundleDir() {
  const candidates = [
    rustTarget && path.join("src-tauri", "target", rustTarget, "release", "bundle", "nsis"),
    path.join("src-tauri", "target", "release", "bundle", "nsis"),
    path.join("src-tauri", "target", "aarch64-pc-windows-msvc", "release", "bundle", "nsis"),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir);
    if (files.some((name) => name.endsWith("-setup.exe") && !name.endsWith(".sig"))) {
      return dir;
    }
  }

  console.error(`No NSIS setup artifacts found. Checked:\n${candidates.join("\n")}`);
  process.exit(1);
}

function resolveAssetNameFromRelease(localSetupFile) {
  const view = spawnSync(
    "gh",
    ["release", "view", tag, "--repo", repo, "--json", "assets"],
    { encoding: "utf8" }
  );
  if (view.status === 0 && view.stdout) {
    try {
      const { assets = [] } = JSON.parse(view.stdout);
      const suffix = localSetupFile.includes("arm64") ? "arm64-setup.exe" : "setup.exe";
      const match = assets.find(
        (asset) =>
          typeof asset.name === "string" &&
          asset.name.endsWith(suffix) &&
          !asset.name.endsWith(".sig")
      );
      if (match?.name) {
        return match.name;
      }
    } catch {
      // fall through to normalized local name
    }
  }

  return toReleaseAssetName(localSetupFile);
}

const bundleDir = resolveBundleDir();
const files = readdirSync(bundleDir);
const setupFile = files.find((name) => name.endsWith("-setup.exe") && !name.endsWith(".sig"));
const sigFile = files.find((name) => name.endsWith("-setup.exe.sig"));

if (!setupFile || !sigFile) {
  console.error(`No NSIS setup artifacts found in ${bundleDir}`);
  process.exit(1);
}

const signature = readFileSync(path.join(bundleDir, sigFile), "utf8").trim();
const releaseAssetName = resolveAssetNameFromRelease(setupFile);
const url = encodeReleaseAssetUrl(releaseAssetName);
const latestUrl = `https://github.com/${repo}/releases/download/${tag}/latest.json`;

const response = await fetch(latestUrl, { cache: "no-store" });
if (!response.ok) {
  console.error(`Failed to fetch latest.json (${response.status}) from ${latestUrl}`);
  process.exit(1);
}

const latest = await response.json();
const entry = { signature, url };
latest.platforms[platformKey] = entry;
latest.platforms[`${platformKey}-nsis`] = entry;

writeFileSync("latest.json", `${JSON.stringify(latest, null, 2)}\n`);

const upload = spawnSync("gh", ["release", "upload", tag, "latest.json", "--repo", repo, "--clobber"], {
  stdio: "inherit",
});

if (upload.status !== 0) {
  process.exit(upload.status ?? 1);
}

console.log(
  `Updated latest.json with ${platformKey} and ${platformKey}-nsis (asset: ${releaseAssetName})`
);
