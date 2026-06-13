import { existsSync } from "node:fs";
import path from "node:path";

/** ring/rustls need a C compiler on Windows; release builds already set this up. */
export function ensureNativeToolchain(env) {
  if (process.platform !== "win32") return env;

  const llvmBin = "C:\\Program Files\\LLVM\\bin";
  if (!existsSync(path.join(llvmBin, "clang.exe"))) return env;

  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "Path";
  const currentPath = env[pathKey] ?? "";
  if (currentPath.toLowerCase().includes(llvmBin.toLowerCase())) return env;

  if (!env.CC) env.CC = "clang";
  env[pathKey] = `${llvmBin};${currentPath}`;
  return env;
}
