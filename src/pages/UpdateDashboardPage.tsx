import { Link } from "react-router-dom";
import { PageTitle } from "../components/PageTitle";

export function UpdateDashboardPage() {
  return (
    <div className="container-fluid">
      <PageTitle title="Update Dashboard" icon="📥" />
      <div className="card-section">
        <p>
          Download and install progress is shown on{" "}
          <Link to="/settings/updates">Update Settings</Link> after you check
          for updates. Full install/rollback requires the desktop update
          package from GitHub releases.
        </p>
      </div>
    </div>
  );
}
