import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import {
  CSV_TEMPLATES,
  downloadCsvTemplate,
  parseCompaniesCsv,
  parsePropertiesCsv,
  parseSalesCsv,
} from "../utils/csv";

type Tab = "backup" | "companies" | "properties" | "sales";

export function ImportExportPage() {
  const { success, error } = useNotification();
  const [tab, setTab] = useState<Tab>("backup");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "danger" | "">("");
  const [dbPath, setDbPath] = useState("");

  const showResult = (ok: boolean, msg: string) => {
    setMessage(msg);
    setMessageType(ok ? "success" : "danger");
    if (ok) success(msg);
    else error(msg);
  };

  const loadPath = async () => {
    try {
      setDbPath(await api.getDatabasePath());
    } catch (e) {
      setDbPath(String(e));
    }
  };

  useEffect(() => {
    if (tab === "backup") loadPath();
  }, [tab]);

  const saveBackupBytes = async (bytes: number[]) => {
    const path = await save({
      defaultPath: "app.db",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });
    if (!path) return;
    await writeFile(path, new Uint8Array(bytes));
    localStorage.setItem("LastBackupDirectory", path.replace(/[^/\\]+$/, ""));
    showResult(true, `Backup saved to ${path}`);
  };

  const handleCreateBackup = async () => {
    try {
      const bytes = await api.createDatabaseBackup();
      await saveBackupBytes(bytes);
    } catch (e) {
      showResult(false, String(e));
    }
  };

  const handleQuickBackup = async () => {
    try {
      const bytes = await api.createDatabaseBackup();
      const lastDir = localStorage.getItem("LastBackupDirectory");
      if (lastDir) {
        const name = `app_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
        const full = `${lastDir}${lastDir.endsWith("/") || lastDir.endsWith("\\") ? "" : "/"}${name}`;
        await writeFile(full, new Uint8Array(bytes));
        showResult(true, `Quick backup saved to ${full}`);
        return;
      }
      await saveBackupBytes(bytes);
    } catch (e) {
      showResult(false, String(e));
    }
  };

  const handleRestore = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".db";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (
        !confirm(
          "Restore will replace the current database. Continue?"
        )
      ) {
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buf));
        await api.restoreDatabaseFile(bytes);
        showResult(
          true,
          "Database restored. Please restart the application."
        );
      } catch (e) {
        showResult(false, String(e));
      }
    };
    input.click();
  };

  const importCsvFile = async (
    parser: (text: string) => unknown[],
    importer: (rows: never[]) => ReturnType<typeof api.importCompaniesCsv>
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const rows = parser(text);
        const result = await importer(rows as never[]);
        showResult(result.success, result.message);
      } catch (e) {
        showResult(false, String(e));
      }
    };
    input.click();
  };

  return (
    <div className="container-fluid">
      <PageTitle title="Import / Export / Backup" icon="⇅" />
      <div className="card-section">
        <ul className="nav nav-tabs mb-4">
          {(
            [
              ["backup", "Backup & Restore"],
              ["companies", "Import Companies"],
              ["properties", "Import Properties"],
              ["sales", "Import Sales"],
            ] as const
          ).map(([key, label]) => (
            <li className="nav-item" key={key}>
              <button
                type="button"
                className={`nav-link ${tab === key ? "active" : ""}`}
                onClick={() => {
                  setTab(key);
                  setMessage("");
                  if (key === "backup") loadPath();
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {message && (
          <div className={`alert alert-${messageType}`}>{message}</div>
        )}

        {tab === "backup" && (
          <div>
            <p className="text-muted small">
              Database path: {dbPath || "Loading…"}
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateBackup}
              >
                Create Backup
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleQuickBackup}
              >
                Quick Backup
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleRestore}
              >
                Restore Database
              </button>
            </div>
            <p className="text-muted small mt-3">
              Restore validates the SQLite header and backs up the current file
              before replacing. Restart the app after restore.
            </p>
          </div>
        )}

        {tab === "companies" && (
          <div>
            <button
              type="button"
              className="btn btn-link"
              onClick={() =>
                downloadCsvTemplate(CSV_TEMPLATES.companies, "companies_template.csv")
              }
            >
              Download CSV template
            </button>
            <button
              type="button"
              className="btn btn-primary ms-2"
              onClick={() =>
                importCsvFile(parseCompaniesCsv, api.importCompaniesCsv)
              }
            >
              Upload & Import Companies
            </button>
          </div>
        )}

        {tab === "properties" && (
          <div>
            <button
              type="button"
              className="btn btn-link"
              onClick={() =>
                downloadCsvTemplate(
                  CSV_TEMPLATES.properties,
                  "properties_template.csv"
                )
              }
            >
              Download CSV template
            </button>
            <button
              type="button"
              className="btn btn-primary ms-2"
              onClick={() =>
                importCsvFile(parsePropertiesCsv, api.importPropertiesCsv)
              }
            >
              Upload & Import Properties
            </button>
          </div>
        )}

        {tab === "sales" && (
          <div>
            <button
              type="button"
              className="btn btn-link"
              onClick={() =>
                downloadCsvTemplate(CSV_TEMPLATES.sales, "sales_template.csv")
              }
            >
              Download CSV template
            </button>
            <button
              type="button"
              className="btn btn-primary ms-2"
              onClick={() =>
                importCsvFile(parseSalesCsv, api.importSalesCsv)
              }
            >
              Upload & Import Sales
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
