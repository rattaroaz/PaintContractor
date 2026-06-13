import { readFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readCargoVersion(path) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error(`Could not read package version from ${path}`);
  }
  return match[1];
}

const packageVersion = readJson("package.json").version;
const tauriVersion = readJson("src-tauri/tauri.conf.json").version;
const cargoVersion = readCargoVersion("src-tauri/Cargo.toml");
const expectedTag =
  process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME ?? process.argv[2] ?? null;

const versions = {
  "package.json": packageVersion,
  "src-tauri/tauri.conf.json": tauriVersion,
  "src-tauri/Cargo.toml": cargoVersion,
};

const uniqueVersions = new Set(Object.values(versions));
if (uniqueVersions.size !== 1) {
  console.error("Version mismatch:");
  for (const [file, version] of Object.entries(versions)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

if (expectedTag) {
  const normalizedTag = expectedTag.startsWith("refs/tags/")
    ? expectedTag.slice("refs/tags/".length)
    : expectedTag;
  if (normalizedTag !== `v${packageVersion}`) {
    console.error(
      `Release tag ${normalizedTag} does not match app version v${packageVersion}.`
    );
    process.exit(1);
  }
}

console.log(`Version sync OK: ${packageVersion}`);
