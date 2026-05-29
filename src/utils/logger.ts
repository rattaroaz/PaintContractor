import { invoke, isTauri } from "@tauri-apps/api/core";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "address",
  "bytes",
  "password",
  "license_number",
  "gate_code",
  "lock_box",
  "garage_remote_code",
  "social_security_number",
  "socialsecuritynumber",
  "contractor_id",
]);

const LARGE_PAYLOAD_KEYS = new Set(["rows", "invoices", "jobs", "bytes"]);

/** Set in Vitest to assert production IPC logging without rebuilding. */
let testDevOverride: boolean | null = null;

export function setTestDevMode(value: boolean | null): void {
  testDevOverride = value;
}

function isDevBuild(): boolean {
  if (testDevOverride !== null) return testDevOverride;
  return (
    import.meta.env.DEV || import.meta.env.VITE_LOG_LEVEL === "debug"
  );
}

function redactValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) {
    if (lower === "bytes" && Array.isArray(value)) {
      return `[${value.length} bytes]`;
    }
    return "[redacted]";
  }
  if (Array.isArray(value)) {
    if (LARGE_PAYLOAD_KEYS.has(lower)) {
      return `[${value.length} items]`;
    }
    return value.map((item) =>
      item && typeof item === "object" ? redactContext(item as LogContext) : item
    );
  }
  if (value && typeof value === "object") {
    return redactContext(value as LogContext);
  }
  return value;
}

export function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

function format(level: LogLevel, message: string, context?: LogContext) {
  const ts = new Date().toISOString();
  const safe = redactContext(context);
  const ctx = safe && Object.keys(safe).length > 0 ? ` ${JSON.stringify(safe)}` : "";
  return `[${ts}] [${level.toUpperCase()}] ${message}${ctx}`;
}

async function sendToBackend(
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  if (!isTauri()) return;
  try {
    const safe = redactContext(context);
    await invoke("log_frontend", {
      level,
      message,
      context:
        safe && Object.keys(safe).length > 0 ? JSON.stringify(safe) : null,
    });
  } catch {
    // avoid recursive logging failures
  }
}

function shouldLogApiDebug(): boolean {
  return isDevBuild();
}

export const logger = {
  info(message: string, context?: LogContext) {
    const line = format("info", message, context);
    console.info(line);
    void sendToBackend("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    const line = format("warn", message, context);
    console.warn(line);
    void sendToBackend("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    const line = format("error", message, context);
    console.error(line);
    void sendToBackend("error", message, context);
  },
  debug(message: string, context?: LogContext) {
    if (!isDevBuild()) return;
    const line = format("debug", message, context);
    console.debug(line);
    void sendToBackend("debug", message, context);
  },
};

/** Trace IPC calls: debug in dev, warn/error only in production builds. */
export function logApiCall(
  cmd: string,
  args?: unknown,
  _result?: unknown,
  error?: unknown,
  durationMs?: number
) {
  const ctx: LogContext = {
    durationMs: durationMs != null ? Math.round(durationMs) : undefined,
  };
  if (args && typeof args === "object") {
    ctx.args = redactContext(args as LogContext);
  }
  if (error) {
    ctx.error = String(error);
    logger.error(`IPC ${cmd} failed`, ctx);
    return;
  }
  if (shouldLogApiDebug()) {
    logger.debug(`IPC ${cmd}`, { ...ctx, ok: true });
  } else if (
    cmd.includes("delete") ||
    cmd.includes("restore") ||
    cmd.includes("import") ||
    cmd.includes("backup") ||
    cmd.includes("apply_receivable")
  ) {
    logger.info(`IPC ${cmd}`, ctx);
  }
}
