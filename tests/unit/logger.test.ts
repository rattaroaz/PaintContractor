import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getInvokeCallsFor,
  mockInvoke,
  pretendNotTauri,
  resetInvokeMock,
} from "../helpers/tauri-mock";

beforeEach(async () => {
  resetInvokeMock();
  vi.restoreAllMocks();
  vi.resetModules();
  const { setTestDevMode } = await import("../../src/utils/logger");
  setTestDevMode(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("redacts sensitive fields in console output", async () => {
    pretendNotTauri();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logger } = await import("../../src/utils/logger");
    logger.info("test", { email: "a@b.com", count: 3 });
    expect(spy).toHaveBeenCalled();
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("a@b.com");
    expect(line).toContain("count");
  });

  it("summarizes large array payloads and redacts nested sensitive values", async () => {
    pretendNotTauri();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logger } = await import("../../src/utils/logger");
    logger.info("import", {
      rows: [
        { name: "Alpha", email: "alpha@example.com", phone: "555-1212" },
        { name: "Beta", address: "1 Main St" },
      ],
      metadata: {
        contact: { email: "nested@example.com" },
        labels: [{ gate_code: "1234" }],
      },
    });

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain("[2 items]");
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("alpha@example.com");
    expect(line).not.toContain("nested@example.com");
    expect(line).not.toContain("1234");
  });

  it("redacts sensitive args on destructive IPC in production builds", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logApiCall, setTestDevMode } = await import(
      "../../src/utils/logger"
    );
    setTestDevMode(false);
    logApiCall("delete_company", {
      id: 42,
      email: "secret@example.com",
      phone: "555-0100",
    });
    expect(spy).toHaveBeenCalled();
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain("IPC delete_company");
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("secret@example.com");
    expect(line).not.toContain("555-0100");
    expect(line).toContain("id");
  });

  it("forwards logs to log_frontend when in Tauri", async () => {
    mockInvoke("log_frontend", async () => null);
    const { logger } = await import("../../src/utils/logger");
    logger.error("boom", { code: 1 });
    const calls = getInvokeCallsFor("log_frontend");
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0]?.level).toBe("error");
    expect(calls[0]?.message).toBe("boom");
  });
});
