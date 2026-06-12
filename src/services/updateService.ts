import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { isVersionNewer } from "@/lib/semver";
import type { UpdateDialogApi } from "@/context/UpdateDialogContext";
import { logger } from "@/utils/logger";

const UPDATE_FEED_UNAVAILABLE_MESSAGE =
  "No update feed is published yet. Push a GitHub release tag (for example v1.0.1) " +
  "with latest.json and signed installer assets. See the project README for setup.";

function upToDateMessage(): string {
  return `${APP_NAME} is up to date (version ${APP_VERSION}).`;
}

function isFeedUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not fetch a valid release json") ||
    lower.includes("failed to fetch") ||
    lower.includes("404") ||
    lower.includes("not found")
  );
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
    const update = await check({ allowDowngrades: false });

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
    await relaunch();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Update check failed", {
      category: "update",
      error: message,
    });

    if (isFeedUnavailableError(message)) {
      dialog.setUpdateDialog({
        phase: "error",
        message: UPDATE_FEED_UNAVAILABLE_MESSAGE,
      });
      return;
    }

    dialog.setUpdateDialog({
      phase: "error",
      message: `Update check failed: ${message}`,
    });
  }
}
