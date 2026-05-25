import { invoke } from "@tauri-apps/api/core";
import { logApiCall } from "./utils/logger";

/** Wraps Tauri `invoke` with timing and structured logging on every API call. */
export async function invokeLogged<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await invoke<T>(cmd, args);
    logApiCall(cmd, args, result, undefined, performance.now() - start);
    return result;
  } catch (err) {
    logApiCall(cmd, args, undefined, err, performance.now() - start);
    throw err;
  }
}
