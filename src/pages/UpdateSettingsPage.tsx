import { useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { PageTitle } from "../components/PageTitle";
import { useUpdateDialog } from "../context/UpdateDialogContext";
import { api } from "../api";
import { APP_VERSION } from "../lib/constants";
import { checkForUpdatesAndApply } from "../services/updateService";
import type { AppLogEntry } from "../types";
import { getLogBuffer } from "../utils/logger";

type LogLevelFilter = "all" | "error" | "warn" | "info" | "debug";

const LEVEL_OPTIONS: { value: LogLevelFilter; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
];

function bufferToEntries(): AppLogEntry[] {
  return getLogBuffer().map((entry) => ({
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
  }));
}

export function UpdateSettingsPage() {
  const dialog = useUpdateDialog();
  const [checking, setChecking] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all");

  const filteredLogs = useMemo(() => {
    const entries =
      levelFilter === "all"
        ? logs
        : logs.filter((entry) => entry.level === levelFilter);
    return [...entries].reverse();
  }, [logs, levelFilter]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await checkForUpdatesAndApply(dialog);
    } finally {
      setChecking(false);
    }
  };

  const handleShowLogs = async () => {
    if (showLogs) {
      setShowLogs(false);
      return;
    }

    setShowLogs(true);
    setLoadingLogs(true);
    setLogError(null);

    try {
      if (isTauri()) {
        setLogs(await api.getAppLogs());
      } else {
        setLogs(bufferToEntries());
      }
    } catch (err) {
      setLogError(err instanceof Error ? err.message : String(err));
      setLogs(bufferToEntries());
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageTitle title="Updates" icon="⚙" />
      <div className="card-section col-lg-8">
        <p className="mb-4">
          <strong>Version:</strong> {APP_VERSION}
        </p>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={checking}
            onClick={() => void handleCheck()}
          >
            {checking ? "Checking…" : "Check for updates"}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void handleShowLogs()}
          >
            {showLogs ? "Hide logs" : "Show logs"}
          </button>
        </div>

        {showLogs && (
          <div className="mt-4">
            <label className="form-label" htmlFor="update-log-level">
              Level
            </label>
            <select
              id="update-log-level"
              className="form-select"
              style={{ maxWidth: "16rem" }}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevelFilter)}
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {loadingLogs && (
              <p className="text-muted mt-3 mb-0">Loading logs…</p>
            )}

            {logError && (
              <p className="text-warning mt-3 mb-0">
                Could not load log files: {logError}
              </p>
            )}

            {!loadingLogs && filteredLogs.length === 0 && (
              <p className="text-muted mt-3 mb-0">No log entries to display.</p>
            )}

            {!loadingLogs && filteredLogs.length > 0 && (
              <ul
                className="list-unstyled mt-3 mb-0 border rounded p-2 bg-light font-monospace small"
                style={{ maxHeight: "24rem", overflowY: "auto" }}
              >
                {filteredLogs.map((entry, index) => (
                  <li key={`${entry.timestamp}-${index}`} className="mb-2">
                    <span className="text-muted">{entry.timestamp}</span>{" "}
                    <span className="fw-semibold text-uppercase">
                      [{entry.level}]
                    </span>{" "}
                    {entry.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
