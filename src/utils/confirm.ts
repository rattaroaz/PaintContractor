import { isTauri } from "@tauri-apps/api/core";
import { confirm as tauriConfirm } from "@tauri-apps/plugin-dialog";

/**
 * Standard confirmation before any destructive delete.
 * Returns `false` if the underlying dialog throws so a transient native error
 * never silently proceeds with deletion.
 */
export async function confirmDelete(message = "Are you sure?"): Promise<boolean> {
  const auto = import.meta.env.VITE_AUTO_CONFIRM;
  if (auto === "1") return true;
  if (auto === "0") return false;

  if (isTauri()) {
    try {
      return await tauriConfirm(message, {
        title: "Confirm delete",
        kind: "warning",
        okLabel: "Yes",
        cancelLabel: "No",
      });
    } catch {
      return false;
    }
  }
  return window.confirm(message);
}
