import { Modal } from "./Modal";
import { useUpdateDialog, type UpdateDialogPhase } from "../context/UpdateDialogContext";

function titleForPhase(phase: UpdateDialogPhase): string {
  switch (phase) {
    case "checking":
      return "Checking for updates";
    case "downloading":
      return "Downloading update";
    case "installing":
      return "Installing update";
    case "up_to_date":
      return "Up to date";
    case "error":
      return "Update error";
    default:
      return "Updates";
  }
}

function isBusyPhase(phase: UpdateDialogPhase): boolean {
  return phase === "checking" || phase === "downloading" || phase === "installing";
}

export function UpdateDialog() {
  const { showUpdateDialog, updatePhase, updateMessage, closeUpdateDialog } =
    useUpdateDialog();

  const busy = isBusyPhase(updatePhase);

  return (
    <Modal
      show={showUpdateDialog}
      title={titleForPhase(updatePhase)}
      onClose={busy ? () => {} : closeUpdateDialog}
      size="sm"
      closable={!busy}
    >
      <p className="mb-0">{updateMessage}</p>
      {busy && (
        <p className="text-muted small mt-2 mb-0">
          Please wait while the update completes.
        </p>
      )}
    </Modal>
  );
}
