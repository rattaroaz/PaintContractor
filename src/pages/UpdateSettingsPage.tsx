import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { GitHubReleaseInfo, UpdateSettings } from "../types";

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
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [release, setRelease] = useState<GitHubReleaseInfo | null>(null);
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [checkOnStartup, setCheckOnStartup] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setCurrentVersion(await api.getAppVersion());
      } catch (e) {
        error(String(e));
      }

      // One-time migration from old localStorage
      const old = localStorage.getItem("UpdateSettings");
      let migrated = false;
      if (old) {
        try {
          const oldCfg = JSON.parse(old) as any;
          const migratedCfg: UpdateSettings = {
            repository_owner: oldCfg.repository_owner || DEFAULT_OWNER,
            repository_name: oldCfg.repository_name || DEFAULT_REPO,
            check_on_startup: oldCfg.check_on_startup ?? true,
            enabled: oldCfg.enabled ?? false,
          };
          await api.saveUpdateConfig(migratedCfg);
          localStorage.removeItem("UpdateSettings");
          localStorage.removeItem("LastUpdateCheck");
          migrated = true;
        } catch {
          /* ignore bad old data */
        }
      }

      try {
        const cfg = await api.getUpdateConfig();
        if (cfg.repository_owner) setOwner(cfg.repository_owner);
        if (cfg.repository_name) setRepo(cfg.repository_name);
        if (cfg.check_on_startup != null) setCheckOnStartup(cfg.check_on_startup);
        if (cfg.enabled != null) setEnabled(cfg.enabled);
        if (cfg.last_check) setLastCheck(cfg.last_check);
      } catch (e) {
        if (!migrated) error("Failed to load update config: " + String(e));
      }
    })();
  }, [error]);

  const saveConfig = async () => {
    try {
      await api.saveUpdateConfig({
        repository_owner: owner,
        repository_name: repo,
        check_on_startup: checkOnStartup,
        enabled,
      });
      success("Update settings saved.");
    } catch (e) {
      error("Failed to save: " + String(e));
    }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setProgress("");
    setUpdateAvailable(null);
    try {
      // Persist the latest owner/repo first
      await api.saveUpdateConfig({
        repository_owner: owner,
        repository_name: repo,
        check_on_startup: checkOnStartup,
        enabled,
      });

      // Real signed update check via the Tauri updater plugin (only in real desktop runtime)
      let update: any = null;
      if (isTauri()) {
        const { check } = await import("@tauri-apps/plugin-updater");
        update = await check();
      } else {
        // In tests / browser dev the real updater is unavailable; fall back to manual GitHub notes
        const gh = await fetchGitHubRelease(owner, repo);
        setRelease({
          ...gh,
          is_update_available: compareVersions(currentVersion, gh.version),
        });
      }
      const now = new Date().toLocaleString();
      setLastCheck(now);

      if (update?.available) {
        setUpdateAvailable(update);
        const ghInfo: GitHubReleaseInfo = {
          version: update.version,
          release_notes: update.notes || "",
          download_url: null,
          is_update_available: true,
        };
        setRelease(ghInfo);
        success(`Update available: v${update.version}`);
      } else {
        // Fallback to manual GitHub notes for visibility
        try {
          const gh = await fetchGitHubRelease(owner, repo);
          setRelease({ ...gh, is_update_available: false });
        } catch {
          /* ignore */
        }
        info("You are on the latest version (or no update.json published yet).");
      }
    } catch (e) {
      error("Update check failed: " + String(e));
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!updateAvailable) return;
    setInstalling(true);
    setProgress("Starting download...");
    try {
      const unlisten = await updateAvailable.listen((ev: any) => {
        if (ev.event === "Started") {
          setProgress("Downloading...");
        } else if (ev.event === "Progress") {
          const pct = ev.data?.chunkLength
            ? Math.round((ev.data.chunkLength / (ev.data.contentLength || 1)) * 100)
            : 0;
          setProgress(`Downloading... ${pct}%`);
        } else if (ev.event === "Finished") {
          setProgress("Download complete. Installing...");
        }
      });
      await updateAvailable.downloadAndInstall();
      unlisten();
      success("Update installed. The application will now restart.");
      // The OS + plugin will usually restart the app automatically on Windows
    } catch (e) {
      error("Install failed: " + String(e));
    } finally {
      setInstalling(false);
      setProgress("");
    }
  };

  // Startup check (respects persisted config; only runs once on mount)
  useEffect(() => {
    // After migration or load, if enabled + checkOnStartup, kick off a background check.
    // We intentionally do NOT auto-check on every settings page visit.
    if (checkOnStartup && enabled) {
      // fire and forget – user can also click the button
      void checkForUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once after initial config load

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
            disabled={checking || installing}
            onClick={checkForUpdates}
          >
            {checking ? "Checking…" : "Check for Updates"}
          </button>
          <button
            type="button"
            className="btn btn-success"
            disabled={!updateAvailable || installing}
            onClick={installUpdate}
          >
            {installing ? "Installing…" : "Download & Install Update"}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={saveConfig}>
            Save Configuration
          </button>
          <Link to="/settings/updates/dashboard" className="btn btn-link">
            Update dashboard
          </Link>
        </div>

        {progress && <div className="alert alert-info py-2 mb-3">{progress}</div>}

        {release && (
          <div
            className={`alert ${
              release.is_update_available ? "alert-success" : "alert-secondary"
            }`}
          >
            <strong>Latest release:</strong> v{release.version}
            {release.is_update_available && (
              <span className="badge bg-warning text-dark ms-2">Update available</span>
            )}
            {updateAvailable && (
              <div className="mt-2">
                <button
                  className="btn btn-sm btn-success"
                  onClick={installUpdate}
                  disabled={installing}
                >
                  Install now (signed & verified)
                </button>
                <small className="text-muted ms-2">
                  Real auto-update via Tauri (requires a properly published release with update.json + .sig files)
                </small>
              </div>
            )}
            {release.download_url && !updateAvailable && (
              <div className="mt-2">
                <a
                  href={release.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-primary"
                >
                  Manual download
                </a>
              </div>
            )}
            {release.release_notes && (
              <pre className="mt-3 small bg-light p-2 mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {release.release_notes.slice(0, 2000)}
              </pre>
            )}
            <div className="mt-2 small text-muted">
              Note: Real updates only work from installed release builds (not `tauri dev`). See README for publishing instructions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
