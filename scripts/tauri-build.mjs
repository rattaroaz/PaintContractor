import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const signedFlag = process.argv.includes("--signed");
const keyPath = path.join(__dirname, "tauri-signing.key");

function hasSigningKey() {
  if (process.env.TAURI_SIGNING_PRIVATE_KEY) return true;
  if (signedFlag && existsSync(keyPath)) {
    process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(keyPath, "utf8");
    return true;
  }
  return false;
}

const signed = hasSigningKey();
const override = signed
  ? ""
  : `-c '{"bundle":{"createUpdaterArtifacts":false}}'`;

if (!signed) {
  console.log(
    "Building without updater artifacts (no signing key). Use npm run build:win:signed for release-parity builds."
  );
}

execSync(`npm run tauri build ${override}`.trim(), {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
