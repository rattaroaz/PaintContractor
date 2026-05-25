import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "../api";
import type { MyCompanyInfo } from "../types";
import { logger } from "../utils/logger";

interface GlobalStateContextValue {
  currentSection: string;
  setCurrentSection: (section: string) => void;
  myCompanyInfo: MyCompanyInfo | null;
  setMyCompanyInfo: (info: MyCompanyInfo) => void;
  refreshCompanyInfo: () => Promise<void>;
  loading: boolean;
}

const defaultCompany: MyCompanyInfo = {
  id: 0,
  name: "",
  phone: "",
  email: "",
  address: "",
  zip: "",
  license_number: "",
};

const GlobalStateContext = createContext<GlobalStateContextValue | null>(null);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [currentSection, setCurrentSection] = useState("Dashboard");
  const [myCompanyInfo, setMyCompanyInfo] = useState<MyCompanyInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const refreshCompanyInfo = useCallback(async () => {
    try {
      const info = await api.getMyCompanyInfo();
      setMyCompanyInfo(info);
    } catch {
      setMyCompanyInfo(defaultCompany);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isTauri()) {
        try {
          const paths = await api.getLoggingPaths();
          const version = await api.getAppVersion();
          logger.info("Application ready", { version, ...paths });
        } catch (e) {
          logger.warn("Startup diagnostics unavailable", { error: String(e) });
        }
      }
      await refreshCompanyInfo();
      setLoading(false);
    })();
  }, [refreshCompanyInfo]);

  const value = useMemo(
    () => ({
      currentSection,
      setCurrentSection,
      myCompanyInfo,
      setMyCompanyInfo,
      refreshCompanyInfo,
      loading,
    }),
    [
      currentSection,
      myCompanyInfo,
      refreshCompanyInfo,
      loading,
    ]
  );

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState(): GlobalStateContextValue {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) {
    throw new Error("useGlobalState must be used within GlobalStateProvider");
  }
  return ctx;
}
