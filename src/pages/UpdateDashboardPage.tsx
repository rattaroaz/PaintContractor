import { Link } from "react-router-dom";
import { PageTitle } from "../components/PageTitle";

export function UpdateDashboardPage() {
  return (
    <div className="container-fluid">
      <PageTitle title="Update Dashboard" icon="📥" />
      <div className="card-section">
        <p>
          Signed auto-updates are managed on the{" "}
          <Link to="/settings/updates">Updates</Link> page. Use{" "}
          <strong>Check for updates</strong> to download and install a newer
          release when one is published.
        </p>
        <p className="text-muted small mb-0">
          Releases are published via GitHub Actions when a <code>vX.Y.Z</code> tag
          is pushed. The installed app fetches <code>latest.json</code> from
          GitHub Releases and verifies signed installers before installing.
        </p>
      </div>
    </div>
  );
}
