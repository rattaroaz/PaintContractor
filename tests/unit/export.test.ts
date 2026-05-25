import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getInvokeCallsFor,
  mockInvoke,
  resetInvokeMock,
  pretendNotTauri,
} from "../helpers/tauri-mock";
import {
  saveAsExcel,
  saveAsPDF,
  saveAsPDFFallback,
  saveBytesToFile,
  setPdfData,
} from "../../src/utils/export";

beforeEach(() => {
  resetInvokeMock();
  localStorage.clear();
  document.body.innerHTML = "";
  setPdfData([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveBytesToFile", () => {
  it("returns false if the user cancels the Tauri save dialog", async () => {
    mockInvoke("plugin:dialog|save", async () => null);
    const ok = await saveBytesToFile(new Uint8Array([1, 2, 3]), "x.bin", []);
    expect(ok).toBe(false);
    expect(getInvokeCallsFor("plugin:fs|write_file")).toHaveLength(0);
  });

  it("writes via the Tauri FS plugin and remembers the directory", async () => {
    mockInvoke(
      "plugin:dialog|save",
      async () => "C:/Users/painter/exports/Report.pdf"
    );
    const writeCalls: unknown[] = [];
    mockInvoke("plugin:fs|write_file", async (args) => {
      writeCalls.push(args);
    });
    const ok = await saveBytesToFile(new Uint8Array([1, 2]), "Report.pdf", [
      { name: "PDF", extensions: ["pdf"] },
    ]);
    expect(ok).toBe(true);
    expect(writeCalls).toHaveLength(1);
    expect(localStorage.getItem("LastExportDirectory")).toBe(
      "C:/Users/painter/exports"
    );

    // Default path should now use the remembered dir for subsequent saves.
    mockInvoke("plugin:dialog|save", async (args) => {
      const options = (args as { options: { defaultPath: string } }).options;
      expect(options.defaultPath).toContain("C:/Users/painter/exports");
      return null;
    });
    await saveBytesToFile(new Uint8Array([1]), "Again.pdf", []);
  });

  it("falls back to a browser blob download outside Tauri", async () => {
    pretendNotTauri();
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clicked: HTMLAnchorElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement;
      if (tag === "a") {
        const origClick = el.click.bind(el);
        el.click = () => {
          clicked.push(el);
          origClick?.();
        };
      }
      return el as HTMLElement;
    });
    const ok = await saveBytesToFile(new Uint8Array([9, 9, 9]), "blob.bin", []);
    expect(ok).toBe(true);
    expect(createUrl).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalled();
    expect(clicked[0]?.download).toBe("blob.bin");
  });
});

describe("saveAsExcel / saveAsPDF", () => {
  it("rejects empty data sets explicitly", async () => {
    await expect(saveAsExcel([])).rejects.toThrow(/no data/i);
    await expect(saveAsPDF([])).rejects.toThrow(/no data/i);
    await expect(saveAsPDFFallback(null)).rejects.toThrow(/no pdf data/i);
  });

  it("builds an xlsx via the Tauri save path", async () => {
    mockInvoke("plugin:dialog|save", async (args) => {
      const opts = (args as { options: { filters: { extensions: string[] }[] } })
        .options;
      expect(opts.filters[0].extensions).toContain("xlsx");
      return "C:/tmp/Report.xlsx";
    });
    mockInvoke("plugin:fs|write_file", async () => undefined);
    const ok = await saveAsExcel(
      [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ],
      "Report.xlsx"
    );
    expect(ok).toBe(true);
    expect(getInvokeCallsFor("plugin:fs|write_file")).toHaveLength(1);
  });

  it("builds a PDF with the requested title via the Tauri save path", async () => {
    mockInvoke("plugin:dialog|save", async (args) => {
      const opts = (args as { options: { filters: { extensions: string[] }[] } })
        .options;
      expect(opts.filters[0].extensions).toContain("pdf");
      return "C:/tmp/Sales.pdf";
    });
    mockInvoke("plugin:fs|write_file", async () => undefined);
    const ok = await saveAsPDF([{ amount: 100 }], "Sales");
    expect(ok).toBe(true);
  });

  it("saveAsPDFFallback falls back to cached PDF data when none is provided", async () => {
    setPdfData([{ a: 1 }]);
    mockInvoke("plugin:dialog|save", async () => "C:/tmp/fallback.pdf");
    mockInvoke("plugin:fs|write_file", async () => undefined);
    const ok = await saveAsPDFFallback(null, "Aging", true);
    expect(ok).toBe(true);
  });
});
