import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const LAST_EXPORT_DIR_KEY = "LastExportDirectory";

function defaultSavePath(filename: string): string {
  const dir = localStorage.getItem(LAST_EXPORT_DIR_KEY);
  if (!dir) return filename;
  const sep = dir.endsWith("/") || dir.endsWith("\\") ? "" : "\\";
  return `${dir}${sep}${filename}`;
}

function rememberExportDir(filePath: string): void {
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  if (dir) localStorage.setItem(LAST_EXPORT_DIR_KEY, dir);
}

/** Write bytes via native save dialog (Tauri) or browser download. */
export async function saveBytesToFile(
  bytes: Uint8Array,
  filename: string,
  filters: { name: string; extensions: string[] }[]
): Promise<boolean> {
  if (isTauri()) {
    const path = await save({
      title: "Save export",
      defaultPath: defaultSavePath(filename),
      filters,
    });
    if (!path) return false;
    await writeFile(path, bytes);
    rememberExportDir(path);
    return true;
  }

  const blob = new Blob([bytes.slice()]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export async function saveAsExcel(
  data: Record<string, string | number>[],
  filename = "Invoices.xlsx"
): Promise<boolean> {
  if (!data.length) {
    throw new Error("No data to export.");
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoices");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return saveBytesToFile(
    new Uint8Array(buf),
    filename,
    [{ name: "Excel Workbook", extensions: ["xlsx"] }]
  );
}

let pdfDataCache: Record<string, string | number>[] = [];

export function setPdfData(data: Record<string, string | number>[]): void {
  pdfDataCache = data;
}

function buildPdfDoc(
  rows: Record<string, string | number>[],
  title: string,
  isLandscape: boolean
): jsPDF {
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  doc.setFontSize(14);
  doc.text(title.replace(/_/g, " ").toUpperCase(), 40, 30);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 45);
  const keys = Object.keys(rows[0]);
  autoTable(doc, {
    head: [keys],
    body: rows.map((row) => keys.map((k) => String(row[k] ?? ""))),
    startY: 55,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  return doc;
}

export async function saveAsPDF(
  data: Record<string, string | number>[],
  title = "Invoices"
): Promise<boolean> {
  if (!data.length) {
    throw new Error("No data to export.");
  }
  const doc = buildPdfDoc(data, title, false);
  const buffer = doc.output("arraybuffer");
  const filename = `${title.replace(/\s+/g, "_")}.pdf`;
  return saveBytesToFile(
    new Uint8Array(buffer),
    filename,
    [{ name: "PDF Document", extensions: ["pdf"] }]
  );
}

export async function saveAsPDFFallback(
  data: Record<string, string | number>[] | null,
  filename = "Invoices",
  isLandscape = false
): Promise<boolean> {
  const rows = data ?? pdfDataCache;
  if (!rows.length) {
    throw new Error("No PDF data available. Export data first.");
  }
  const doc = buildPdfDoc(rows, filename, isLandscape);
  const buffer = doc.output("arraybuffer");
  const outName = filename.endsWith(".pdf")
    ? filename
    : `${filename}_fallback.pdf`;
  return saveBytesToFile(
    new Uint8Array(buffer),
    outName,
    [{ name: "PDF Document", extensions: ["pdf"] }]
  );
}
