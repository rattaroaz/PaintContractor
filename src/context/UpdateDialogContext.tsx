import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UpdateDialogPhase =
  | "idle"
  | "checking"
  | "up_to_date"
  | "downloading"
  | "installing"
  | "error";

export interface UpdateDialogApi {
  openUpdateDialog: () => void;
  closeUpdateDialog: () => void;
  setUpdateDialog: (update: {
    phase: UpdateDialogPhase;
    message: string;
  }) => void;
}

interface UpdateDialogContextValue extends UpdateDialogApi {
  showUpdateDialog: boolean;
  updatePhase: UpdateDialogPhase;
  updateMessage: string;
}

const UpdateDialogContext = createContext<UpdateDialogContextValue | null>(null);

export function UpdateDialogProvider({ children }: { children: ReactNode }) {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updatePhase, setUpdatePhase] = useState<UpdateDialogPhase>("idle");
  const [updateMessage, setUpdateMessage] = useState("");

  const openUpdateDialog = useCallback(() => {
    setShowUpdateDialog(true);
    setUpdatePhase("checking");
    setUpdateMessage("Checking for updates…");
  }, []);

  const closeUpdateDialog = useCallback(() => {
    setShowUpdateDialog(false);
    setUpdatePhase("idle");
    setUpdateMessage("");
  }, []);

  const setUpdateDialog = useCallback(
    (update: { phase: UpdateDialogPhase; message: string }) => {
      setShowUpdateDialog(true);
      setUpdatePhase(update.phase);
      setUpdateMessage(update.message);
    },
    []
  );

  const value = useMemo(
    () => ({
      showUpdateDialog,
      updatePhase,
      updateMessage,
      openUpdateDialog,
      closeUpdateDialog,
      setUpdateDialog,
    }),
    [
      showUpdateDialog,
      updatePhase,
      updateMessage,
      openUpdateDialog,
      closeUpdateDialog,
      setUpdateDialog,
    ]
  );

  return (
    <UpdateDialogContext.Provider value={value}>
      {children}
    </UpdateDialogContext.Provider>
  );
}

export function useUpdateDialog(): UpdateDialogContextValue {
  const ctx = useContext(UpdateDialogContext);
  if (!ctx) {
    throw new Error("useUpdateDialog must be used within UpdateDialogProvider");
  }
  return ctx;
}
