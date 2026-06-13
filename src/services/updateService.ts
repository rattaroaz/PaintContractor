import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { isVersionNewer } from "@/lib/semver";
import type { UpdateDialogApi } from "@/context/UpdateDialogContext";
import { logger } from "@/utils/logger";
import { resolveUpdateErrorMessage } from "./updateErrors";
import type { PaintUpdaterMock, UpdaterCheckResult } from "./updaterTypes";

export {
  UPDATE_FEED_UNAVAILABLE_MESSAGE,
  UNSUPPORTED_PLATFORM_MESSAGE,
} from "./updateErrors";

function upToDateMessage(): string {
  return `${APP_NAME} is up to date (version ${APP_VERSION}).`;
}

function getUpdaterDeps(): {
  check: (options?: { allowDowngrades?: boolean }) => Promise<UpdaterCheckResult | null>;
  relaunch: () => Promise<void>;
} {
  if (import.meta.env.VITE_TAURI_MOCK === "1" && typeof window !== "undefined") {
    const mock: PaintUpdaterMock | undefined = window.__paintUpdaterMock;
    if (mock) {
      return {
        check: mock.check,
        relaunch: mock.relaunch ?? (() => relaunch()),
      };
    }
  }
  return {
    check: (options) => check(options) as Promise<UpdaterCheckResult | null>,
    relaunch: () => relaunch(),
  };
}

export async function checkForUpdatesAndApply(
  dialog: UpdateDialogApi
): Promise<void> {
  if (import.meta.env.VITE_E2E === "true") {
    dialog.openUpdateDialog();
    dialog.setUpdateDialog({
      phase: "up_to_date",
      message: upToDateMessage(),
    });
    return;
  }

  if (!isTauri()) {
    dialog.openUpdateDialog();
    dialog.setUpdateDialog({
      phase: "error",
      message: "Updates are only available in the installed desktop application.",
    });
    return;
  }

  const { check: runCheck, relaunch: runRelaunch } = getUpdaterDeps();

  dialog.openUpdateDialog();
  dialog.setUpdateDialog({
    phase: "checking",
    message: `Checking for updates (installed version ${APP_VERSION})…`,
  });

  logger.info("Update check started", {
    category: "update",
    installedVersion: APP_VERSION,
  });

  try {
    const update = await runCheck({ allowDowngrades: false });

    if (!update || !isVersionNewer(update.version, APP_VERSION)) {
      const remote = update?.version ?? APP_VERSION;
      logger.info("Update check: up to date", {
        category: "update",
        installedVersion: APP_VERSION,
        remoteVersion: remote,
      });
      dialog.setUpdateDialog({
        phase: "up_to_date",
        message: upToDateMessage(),
      });
      return;
    }

    logger.info("Update available", {
      category: "update",
      installedVersion: APP_VERSION,
      remoteVersion: update.version,
    });

    dialog.setUpdateDialog({
      phase: "downloading",
      message: `Downloading version ${update.version}…`,
    });

    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        logger.info("Update download started", { category: "update" });
      } else if (event.event === "Finished") {
        logger.info("Update download finished", { category: "update" });
      }
    });

    dialog.setUpdateDialog({
      phase: "installing",
      message: "Installing update. The application will restart…",
    });

    logger.info("Update install complete; relaunching", { category: "update" });
    await runRelaunch();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Update check failed", {
      category: "update",
      error: message,
    });

    dialog.setUpdateDialog({
      phase: "error",
      message: resolveUpdateErrorMessage(message),
    });
  }
}
