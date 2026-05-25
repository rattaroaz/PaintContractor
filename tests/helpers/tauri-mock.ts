/**
 * Shared mock harness for Tauri's IPC layer.
 *
 * The official `@tauri-apps/api/core` `invoke()` and `isTauri()` both check
 * `window.__TAURI_INTERNALS__`. Installing a mock there lets the real
 * production code path execute in Vitest and Playwright without any source
 * changes — the same way the official `@tauri-apps/api/mocks` module works,
 * but with a simpler synchronous handler map we can drive from tests.
 */

export type InvokeHandler = (
  args: Record<string, unknown>,
  options?: unknown
) => unknown | Promise<unknown>;

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: unknown, options?: unknown) => Promise<unknown>;
      transformCallback?: (callback?: unknown, once?: boolean) => number;
    };
    __MOCK_INVOKE_CALLS__?: InvokeCall[];
    isTauri?: boolean;
  }
}

export interface InvokeCall {
  cmd: string;
  args: Record<string, unknown>;
  options?: unknown;
}

const handlers = new Map<string, InvokeHandler>();
const calls: InvokeCall[] = [];

export function mockInvoke(cmd: string, handler: InvokeHandler): void {
  handlers.set(cmd, handler);
}

export function mockInvokeMany(map: Record<string, InvokeHandler>): void {
  for (const [cmd, handler] of Object.entries(map)) {
    handlers.set(cmd, handler);
  }
}

export function getInvokeCalls(): ReadonlyArray<InvokeCall> {
  return calls.slice();
}

export function getInvokeCallsFor(cmd: string): ReadonlyArray<Record<string, unknown>> {
  return calls.filter((c) => c.cmd === cmd).map((c) => c.args);
}

export function resetInvokeMock(): void {
  handlers.clear();
  calls.length = 0;
  installInvokeShim();
}

function installInvokeShim(): void {
  let cb = 0;
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, rawArgs, options) => {
      const args =
        rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
          ? (rawArgs as Record<string, unknown>)
          : { value: rawArgs };
      calls.push({ cmd, args, options });
      const handler = handlers.get(cmd);
      if (!handler) {
        throw new Error(`No mock handler installed for invoke command "${cmd}"`);
      }
      return handler(args, options);
    },
    transformCallback: () => ++cb,
  };
  window.isTauri = true;
  window.__MOCK_INVOKE_CALLS__ = calls;
}

/** Force `isTauri()` to return false (test the browser fallback paths). */
export function pretendNotTauri(): void {
  window.isTauri = false;
  delete window.__TAURI_INTERNALS__;
}

installInvokeShim();

/** Convenience: simulate a successful Rust `OperationResult<T>`. */
export function okResult<T>(data: T, message = "") {
  return { success: true, message, data };
}

/** Convenience: simulate a failed Rust `OperationResult`. */
export function errResult(message: string) {
  return { success: false, message };
}

/**
 * Stub destructive confirm paths. The Tauri dialog plugin funnels
 * `confirm()` and `ask()` through `plugin:dialog|message`, and the result is
 * compared to the okLabel string. `confirmDelete()` passes `okLabel: "Yes"`,
 * so we return "Yes" / "No" accordingly.
 */
export function autoConfirm(value: boolean): void {
  (window as unknown as { confirm: () => boolean }).confirm = () => value;
  mockInvoke("plugin:dialog|message", async () => (value ? "Yes" : "No"));
  mockInvoke("plugin:dialog|confirm", async () => value);
  mockInvoke("plugin:dialog|ask", async () => value);
}

