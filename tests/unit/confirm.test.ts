import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoConfirm,
  getInvokeCallsFor,
  mockInvoke,
  pretendNotTauri,
  resetInvokeMock,
} from "../helpers/tauri-mock";
import { confirmDelete } from "../../src/utils/confirm";

beforeEach(() => {
  resetInvokeMock();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("confirmDelete", () => {
  it("routes through the Tauri dialog plugin when inside Tauri", async () => {
    autoConfirm(true);
    await expect(confirmDelete("Delete x?")).resolves.toBe(true);
    const calls = getInvokeCallsFor("plugin:dialog|message");
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it("returns false when the dialog plugin reports a negative response", async () => {
    autoConfirm(false);
    await expect(confirmDelete()).resolves.toBe(false);
  });

  it("uses window.confirm when not inside Tauri", async () => {
    pretendNotTauri();
    const spy = vi
      .spyOn(window, "confirm")
      .mockImplementation(() => true);
    await expect(confirmDelete("Sure?")).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith("Sure?");
  });

  it("falls back to window.confirm with default copy and returns the response", async () => {
    pretendNotTauri();
    (window as unknown as { confirm: () => boolean }).confirm = () => false;
    await expect(confirmDelete()).resolves.toBe(false);
  });

  it("treats plugin errors as a safe negative answer", async () => {
    mockInvoke("plugin:dialog|message", async () => {
      throw new Error("nope");
    });
    await expect(confirmDelete("x")).resolves.toBe(false);
  });

  it("honors VITE_AUTO_CONFIRM without calling the dialog plugin", async () => {
    vi.stubEnv("VITE_AUTO_CONFIRM", "1");
    vi.resetModules();
    const { confirmDelete: autoYes } = await import("../../src/utils/confirm");
    await expect(autoYes()).resolves.toBe(true);
    expect(getInvokeCallsFor("plugin:dialog|message").length).toBe(0);
    vi.stubEnv("VITE_AUTO_CONFIRM", "0");
    vi.resetModules();
    const { confirmDelete: autoNo } = await import("../../src/utils/confirm");
    await expect(autoNo()).resolves.toBe(false);
  });
});
