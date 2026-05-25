import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { logger } from "../utils/logger";

export type NotificationType = "success" | "error" | "info";

export interface Toast {
  id: number;
  type: NotificationType;
  message: string;
}

interface NotificationContextValue {
  notify: (type: NotificationType, message: string, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

let nextId = 1;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: NotificationType, message: string, durationMs = 4000) => {
      const id = nextId++;
      if (type === "error") {
        logger.error("User-facing error", { message });
      } else if (type === "success") {
        logger.info("User-facing success", { message });
      } else {
        logger.debug("User-facing info", { message });
      }
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const value = useMemo(
    () => ({
      notify,
      success: (message: string) => notify("success", message),
      error: (message: string) => notify("error", message, 5000),
      info: (message: string) => notify("info", message),
    }),
    [notify]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        className="toast-container position-fixed top-0 end-0 p-3"
        style={{ zIndex: 1080 }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast show align-items-center text-white border-0 mb-2 bg-${
              t.type === "success"
                ? "success"
                : t.type === "error"
                  ? "danger"
                  : "info"
            }`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body">{t.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => remove(t.id)}
                aria-label="Close"
              />
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}
