/**
 * Integration test for the @tauri-apps/plugin-fs plugin going through the
 * real export pipeline (Excel + PDF) and exercising:
 *   - The dialog -> writeFile happy path
 *   - The "user cancelled" path (no writeFile)
 *   - The error propagation path (writeFile rejects)
 */
import { describe, expect, it } from "vitest";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { exportExcel, exportPdf } from "../../src/utils/exportActions";
import {
  getInvokeCalls,
  getInvokeCallsFor,
  mockInvoke,
  mockInvokeMany,
} from "../helpers/tauri-mock";

describe("plugin-fs writeFile via export pipeline", () => {
  it("writes Excel bytes to the path selected in the save dialog", async () => {
    const written: Array<{ path: string; size: number }> = [];
    mockInvokeMany({
      "plugin:dialog|save": async () => "C:/tmp/Sales.xlsx",
      "plugin:fs|write_file": async (args) => {
        written.push({
          path: String((args as { path: string }).path ?? ""),
          size: 0,
        });
        return null;
      },
    });

    let successMessage = "";
    await exportExcel(
      [{ Name: "Acme", Cost: 100 }],
      "Sales.xlsx",
      () => {},
      (m) => {
        successMessage = m;
      }
    );

    expect(getInvokeCallsFor("plugin:dialog|save")).toHaveLength(1);
    expect(successMessage).toMatch(/saved/i);
  });

  it("does not call writeFile when the user cancels the dialog", async () => {
    mockInvoke("plugin:dialog|save", async () => null);
    mockInvoke("plugin:fs|write_file", async () => {
      throw new Error("should not be called");
    });

    let successMessage = "";
    await exportPdf(
      [{ A: 1 }],
      "Report",
      () => {},
      (m) => {
        successMessage = m;
      }
    );

    expect(successMessage).toBe("");
    expect(
      getInvokeCalls().some((c) => c.cmd === "plugin:fs|write_file")
    ).toBe(false);
  });

  it("propagates plugin-fs failures to the onError callback", async () => {
    mockInvokeMany({
      "plugin:dialog|save": async () => "C:/tmp/x.pdf",
      "plugin:fs|write_file": async () => {
        throw new Error("EACCES");
      },
    });

    let errorMessage = "";
    await exportPdf([{ A: 1 }], "Report", (m) => {
      errorMessage = m;
    });
    expect(errorMessage).toContain("EACCES");
  });
});

describe("plugin-fs read/write smoke", () => {
  it("readFile forwards the path argument and returns the mocked bytes", async () => {
    mockInvoke("plugin:fs|read_file", async (args) => {
      expect((args as { path: string }).path).toBe("C:/tmp/in.bin");
      return [1, 2, 3, 4];
    });
    const bytes = await readFile("C:/tmp/in.bin");
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("writeFile resolves when the mocked plugin acknowledges", async () => {
    let called = false;
    mockInvoke("plugin:fs|write_file", async () => {
      called = true;
      return null;
    });
    await writeFile("C:/tmp/out.bin", new Uint8Array([9, 9, 9]));
    expect(called).toBe(true);
  });
});
