import { useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { useUpdateDialog } from "../context/UpdateDialogContext";
import { APP_VERSION } from "../lib/constants";
import { checkForUpdatesAndApply } from "../services/updateService";

export function UpdateSettingsPage() {
  const dialog = useUpdateDialog();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await checkForUpdatesAndApply(dialog);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageTitle title="Updates" icon="⚙" />
      <div className="card-section col-lg-8">
        <p className="mb-4">
          <strong>Version:</strong> {APP_VERSION}
        </p>

        <button
          type="button"
          className="btn btn-primary"
          disabled={checking}
          onClick={() => void handleCheck()}
        >
          {checking ? "Checking…" : "Check for updates"}
        </button>
      </div>
    </div>
  );
}
