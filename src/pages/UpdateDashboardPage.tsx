import { Link } from "react-router-dom";
import { PageTitle } from "../components/PageTitle";

export function UpdateDashboardPage() {
  return (
    <div className="container-fluid">
      <PageTitle title="Update Dashboard" icon="📥" />
      <div className="card-section">
        <p>
          Real auto-update (signed downloads + install) now lives on{" "}
          <Link to="/settings/updates">Update Settings</Link>. Use the "Check for Updates"
          and "Download &amp; Install Update" buttons there.
        </p>
        <p className="text-muted small">
          This page is a placeholder for future advanced progress/history. Publishing
          updates requires generating signing keys once and uploading a proper
          <code>update.json</code> + signed bundles (see README).
        </p>
      </div>
    </div>
  );
}
