export interface UpdaterCheckResult {
  version: string;
  downloadAndInstall: (
    onEvent?: (event: { event: "Started" | "Finished" | string }) => void
  ) => Promise<void>;
}

export interface PaintUpdaterMock {
  check: (options?: { allowDowngrades?: boolean }) => Promise<UpdaterCheckResult | null>;
  relaunch?: () => Promise<void>;
}

declare global {
  interface Window {
    __paintUpdaterMock?: PaintUpdaterMock;
  }
}

export {};
