import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DesktopRuntimeGate } from "./components/DesktopRuntimeGate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalStateProvider } from "./context/GlobalStateContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UpdateDialogProvider } from "./context/UpdateDialogContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";

async function bootstrap() {
  if (import.meta.env.VITE_TAURI_MOCK === "1") {
    await import("./test-utils/install-tauri-mock");
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <DesktopRuntimeGate>
            <NotificationProvider>
              <UpdateDialogProvider>
                <GlobalStateProvider>
                  <App />
                </GlobalStateProvider>
              </UpdateDialogProvider>
            </NotificationProvider>
          </DesktopRuntimeGate>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

void bootstrap();
