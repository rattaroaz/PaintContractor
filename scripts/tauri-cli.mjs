import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureNativeToolchain } from "./ensure-native-toolchain.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tauriCli = path.join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [tauriCli, ...args], {
  cwd: root,
  stdio: "inherit",
  env: ensureNativeToolchain({ ...process.env }),
});

process.exit(result.status ?? 1);
