import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DesktopRuntimeGate } from "./components/DesktopRuntimeGate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalStateProvider } from "./context/GlobalStateContext";
import { NotificationProvider } from "./context/NotificationContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";

if (import.meta.env.VITE_TAURI_MOCK === "1") {
  await import("./test-utils/install-tauri-mock");
} else {
  const { isTauri } = await import("@tauri-apps/api/core");
  if (isTauri() && !localStorage.getItem("UpdateSettings")) {
    localStorage.setItem(
      "UpdateSettings",
      JSON.stringify({
        repository_owner: "rattaroaz",
        repository_name: "DKSKMaui",
        check_on_startup: false,
        enabled: false,
      })
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <DesktopRuntimeGate>
          <NotificationProvider>
            <GlobalStateProvider>
              <App />
            </GlobalStateProvider>
          </NotificationProvider>
        </DesktopRuntimeGate>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
