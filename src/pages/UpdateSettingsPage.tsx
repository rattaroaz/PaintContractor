import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { GitHubReleaseInfo } from "../types";

const DEFAULT_OWNER = "rattaroaz";
const DEFAULT_REPO = "DKSKMaui";

function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) =>
    v.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse(current);
  const b = parse(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (bv > av) return true;
    if (bv < av) return false;
  }
  return false;
}

async function fetchGitHubRelease(
  owner: string,
  repo: string
): Promise<GitHubReleaseInfo> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`
  );
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = (await res.json()) as {
    tag_name: string;
    body: string;
    assets: { browser_download_url: string }[];
  };
  const version = data.tag_name.replace(/^v/, "");
  return {
    version,
    release_notes: data.body ?? "",
    download_url: data.assets[0]?.browser_download_url ?? null,
    is_update_available: false,
  };
}

export function UpdateSettingsPage() {
  const { success, error, info } = useNotification();
  const [currentVersion, setCurrentVersion] = useState("");
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [release, setRelease] = useState<GitHubReleaseInfo | null>(null);
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [checkOnStartup, setCheckOnStartup] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCurrentVersion(await api.getAppVersion());
      } catch (e) {
        error(String(e));
      }
      const saved = localStorage.getItem("UpdateSettings");
      if (saved) {
        try {
          const cfg = JSON.parse(saved) as {
            repository_owner?: string;
            repository_name?: string;
            check_on_startup?: boolean;
            enabled?: boolean;
          };
          if (cfg.repository_owner) setOwner(cfg.repository_owner);
          if (cfg.repository_name) setRepo(cfg.repository_name);
          if (cfg.check_on_startup != null)
            setCheckOnStartup(cfg.check_on_startup);
          if (cfg.enabled != null) setEnabled(cfg.enabled);
        } catch {
          /* ignore */
        }
      }
      const last = localStorage.getItem("LastUpdateCheck");
      if (last) setLastCheck(last);
    })();
  }, [error]);

  const saveConfig = () => {
    localStorage.setItem(
      "UpdateSettings",
      JSON.stringify({
        repository_owner: owner,
        repository_name: repo,
        check_on_startup: checkOnStartup,
        enabled,
      })
    );
    success("Update settings saved.");
  };

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const infoRelease = await fetchGitHubRelease(owner, repo);
      const cur = currentVersion || (await api.getAppVersion());
      const available = compareVersions(cur, infoRelease.version);
      const result: GitHubReleaseInfo = {
        ...infoRelease,
        is_update_available: available,
      };
      setRelease(result);
      const now = new Date().toLocaleString();
      setLastCheck(now);
      localStorage.setItem("LastUpdateCheck", now);
      if (available) {
        success(`Update available: v${infoRelease.version}`);
      } else {
        info("You are on the latest version.");
      }
    } catch (e) {
      error(String(e));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (checkOnStartup && enabled) {
      checkForUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-fluid">
      <PageTitle title="Update Settings" icon="⚙" />
      <div className="card-section col-lg-8">
        <p>
          <strong>Current version:</strong> {currentVersion || "…"}
        </p>
        {lastCheck && (
          <p className="text-muted small">Last check: {lastCheck}</p>
        )}

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label">Repository Owner</label>
            <input
              className="form-control"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Repository Name</label>
            <input
              className="form-control"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>
          <div className="col-12">
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />{" "}
              Updates enabled
            </label>
          </div>
          <div className="col-12">
            <label>
              <input
                type="checkbox"
                checked={checkOnStartup}
                onChange={(e) => setCheckOnStartup(e.target.checked)}
              />{" "}
              Check on startup
            </label>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={checking}
            onClick={checkForUpdates}
          >
            {checking ? "Checking…" : "Check for Updates"}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={saveConfig}>
            Save Configuration
          </button>
          <Link
            to="/settings/updates/dashboard"
            className="btn btn-link"
          >
            Update dashboard
          </Link>
        </div>

        {release && (
          <div
            className={`alert ${
              release.is_update_available ? "alert-success" : "alert-secondary"
            }`}
          >
            <strong>Latest release:</strong> v{release.version}
            {release.is_update_available && (
              <span className="badge bg-warning text-dark ms-2">
                Update available
              </span>
            )}
            {release.download_url && (
              <div className="mt-2">
                <a
                  href={release.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-primary"
                >
                  Download
                </a>
              </div>
            )}
            {release.release_notes && (
              <pre className="mt-3 small bg-light p-2 mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {release.release_notes.slice(0, 2000)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
