import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const keyPath = path.join(__dirname, "tauri-signing.key");

function loadSigningEnv() {
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY && existsSync(keyPath)) {
    process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(keyPath, "utf8").trim();
  }
  const hasKey = Boolean(process.env.TAURI_SIGNING_PRIVATE_KEY);
  const hasPassword = Boolean(process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD);
  return { hasKey, hasPassword };
}

const { hasKey, hasPassword } = loadSigningEnv();

if (hasKey && !hasPassword) {
  console.error(
    "Found scripts/tauri-signing.key but TAURI_SIGNING_PRIVATE_KEY_PASSWORD is not set.\n" +
      "Set it in your shell before building, for example:\n" +
      '  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your-password"'
  );
  process.exit(1);
}

const configOverride = hasKey
  ? null
  : JSON.stringify({ bundle: { createUpdaterArtifacts: false } });

if (!hasKey) {
  console.log(
    "Building without updater artifacts (no signing key). Set TAURI_SIGNING_PRIVATE_KEY or place scripts/tauri-signing.key for signed builds."
  );
}

const args = ["run", "tauri", "--", "build"];
if (configOverride) {
  args.push("-c", configOverride);
}

execSync(`npm ${args.map((a) => `"${a}"`).join(" ")}`, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});
