import { isTauri } from "@tauri-apps/api/core";
import { confirm as tauriConfirm } from "@tauri-apps/plugin-dialog";

/** Standard confirmation before any destructive delete. */
export async function confirmDelete(): Promise<boolean> {
  if (isTauri()) {
    return tauriConfirm("Are you sure?", {
      title: "Confirm delete",
      kind: "warning",
      okLabel: "Yes",
      cancelLabel: "No",
    });
  }
  return window.confirm("Are you sure?");
}
