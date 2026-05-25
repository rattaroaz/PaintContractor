import {
  saveAsExcel,
  saveAsPDFFallback,
  setPdfData,
} from "./export";

/** Run an export; show errors via callback. Returns false if user cancelled save dialog. */
export async function runExport(
  action: () => Promise<boolean>,
  onError: (message: string) => void,
  onSuccess?: (message: string) => void
): Promise<void> {
  try {
    const saved = await action();
    if (saved && onSuccess) {
      onSuccess("File saved successfully.");
    }
  } catch (e) {
    onError(e instanceof Error ? e.message : String(e));
  }
}

export async function exportPdf(
  data: Record<string, string | number>[],
  baseName: string,
  onError: (message: string) => void,
  onSuccess?: (message: string) => void
): Promise<void> {
  setPdfData(data);
  await runExport(
    () => saveAsPDFFallback(data, baseName),
    onError,
    onSuccess
  );
}

export async function exportExcel(
  data: Record<string, string | number>[],
  filename: string,
  onError: (message: string) => void,
  onSuccess?: (message: string) => void
): Promise<void> {
  await runExport(() => saveAsExcel(data, filename), onError, onSuccess);
}
