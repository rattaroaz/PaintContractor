import type { ReactNode } from "react";
import { GlobalStateProvider } from "./GlobalStateContext";
import { NotificationProvider } from "./NotificationContext";
import { UpdateDialogProvider } from "./UpdateDialogContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <UpdateDialogProvider>
        <GlobalStateProvider>{children}</GlobalStateProvider>
      </UpdateDialogProvider>
    </NotificationProvider>
  );
}
