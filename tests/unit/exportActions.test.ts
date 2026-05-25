import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockInvoke, resetInvokeMock } from "../helpers/tauri-mock";
import { exportPdf, exportExcel } from "../../src/utils/exportActions";

beforeEach(() => {
  resetInvokeMock();
  mockInvoke("plugin:dialog|save", async () => "C:/tmp/out.dat");
  mockInvoke("plugin:fs|write_file", async () => undefined);
});

describe("exportActions", () => {
  it("calls success when PDF export completes", async () => {
    const success = vi.fn();
    const error = vi.fn();
    await exportPdf([{ amount: 100 }], "Sales", error, success);
    expect(error).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith(expect.stringMatching(/saved/i));
  });

  it("calls success when Excel export completes", async () => {
    const success = vi.fn();
    const error = vi.fn();
    await exportExcel([{ a: 1 }], "Sales.xlsx", error, success);
    expect(success).toHaveBeenCalledWith(expect.stringMatching(/saved/i));
  });

  it("routes exporter failures into error()", async () => {
    const success = vi.fn();
    const error = vi.fn();
    await exportPdf([], "Sales", error, success);
    expect(success).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/no pdf data/i));
  });

  it("does not call success if the user cancels the Tauri save dialog", async () => {
    resetInvokeMock();
    mockInvoke("plugin:dialog|save", async () => null);
    const success = vi.fn();
    const error = vi.fn();
    await exportExcel([{ a: 1 }], "Sales.xlsx", error, success);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
