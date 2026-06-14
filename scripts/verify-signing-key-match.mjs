/**
 * Ensure latest.json signatures were produced with the same minisign key pair
 * as plugins.updater.pubkey in tauri.conf.json.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeSignatureText, loadConfiguredPubKey } from "./minisign-utils.mjs";

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

const expected = loadConfiguredPubKey();
const expectedKeyId = expected.keyId.toString("hex");

const pubFilePath = path.join(root, "scripts", "tauri-signing.key.pub");
const pubFile = readFileSync(pubFilePath, "utf8").trim();
const confPub = JSON.parse(
  readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8")
).plugins?.updater?.pubkey?.trim();
if (pubFile !== confPub) {
  console.warn(
    "Warning: tauri.conf.json pubkey differs from scripts/tauri-signing.key.pub; using tauri.conf.json."
  );
}

const latestUrl = `https://github.com/${repo}/releases/download/${tag}/latest.json`;
const response = await fetch(latestUrl, { cache: "no-store" });
if (!response.ok) {
  console.error(`Failed to fetch latest.json (${response.status}) from ${latestUrl}`);
  process.exit(1);
}

const latest = await response.json();
let failed = false;

for (const platform of expectedPlatforms) {
  const entry = latest.platforms?.[platform];
  if (!entry?.signature) {
    console.error(`latest.json platform ${platform} is missing a signature.`);
    failed = true;
    continue;
  }

  try {
    const signature = decodeSignatureText(entry.signature);
    const signatureKeyId = signature.keyId.toString("hex");
    if (!signature.keyId.equals(expected.keyId)) {
      console.error(
        `Signing key mismatch for ${platform}: latest.json was signed with key id ${signatureKeyId}, ` +
          `but tauri.conf.json expects ${expectedKeyId}. ` +
          "Update GitHub secrets TAURI_SIGNING_PRIVATE_KEY / TAURI_SIGNING_PRIVATE_KEY_PASSWORD " +
          "to match scripts/tauri-signing.key.pub, then re-run the Release workflow."
      );
      failed = true;
    }
  } catch (err) {
    console.error(
      `Could not parse signature for ${platform}: ${err instanceof Error ? err.message : String(err)}`
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `Signing key OK for ${tag}: all checked platforms match pubkey key id ${expectedKeyId}.`
);
