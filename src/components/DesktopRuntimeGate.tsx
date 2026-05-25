import { isTauri } from "@tauri-apps/api/core";
import type { ReactNode } from "react";

/**
 * The UI requires the Tauri desktop shell (WebView2 + Rust backend).
 * `npm run dev:vite` / opening localhost in Chrome will not work.
 */
export function DesktopRuntimeGate({ children }: { children: ReactNode }) {
  if (isTauri()) {
    return <>{children}</>;
  }

  return (
    <div className="container py-5">
      <div className="card border-warning shadow-sm">
        <div className="card-body">
          <h4 className="card-title text-warning">Desktop app required</h4>
          <p className="card-text">
            This project is a <strong>Windows Tauri desktop application</strong>, not
            a website. The browser cannot talk to SQLite or native dialogs, so
            nothing will save or load here.
          </p>
          <p className="card-text mb-2">From the project folder, run:</p>
          <pre className="bg-dark text-light p-3 rounded mb-3">
            npm install{"\n"}
            npm run dev
          </pre>
          <p className="small text-muted mb-0">
            That starts <code>tauri dev</code> and opens the DKSK window. For
            browser-only UI tests with a mock backend, use{" "}
            <code>npm run dev:vite</code> with <code>VITE_TAURI_MOCK=1</code>{" "}
            (<code>npm run dev:test</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
