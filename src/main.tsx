import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalStateProvider } from "./context/GlobalStateContext";
import { NotificationProvider } from "./context/NotificationContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NotificationProvider>
          <GlobalStateProvider>
            <App />
          </GlobalStateProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
