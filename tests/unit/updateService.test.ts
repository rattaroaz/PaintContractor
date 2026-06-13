import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForUpdatesAndApply } from "../../src/services/updateService";
import type { UpdateDialogApi } from "../../src/context/UpdateDialogContext";
import { APP_NAME, APP_VERSION } from "../../src/lib/constants";
import { parseSemver } from "../../src/lib/semver";
import {
  UPDATE_FEED_UNAVAILABLE_MESSAGE,
  UNSUPPORTED_PLATFORM_MESSAGE,
} from "../../src/services/updateErrors";

const check = vi.fn();
const relaunch = vi.fn();
const isTauri = vi.fn(() => true);

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: (...args: unknown[]) => check(...args),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: (...args: unknown[]) => relaunch(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => isTauri(),
}));

function createDialog(): UpdateDialogApi & {
  calls: Array<{ phase: string; message: string }>;
} {
  const calls: Array<{ phase: string; message: string }> = [];
  return {
    calls,
    openUpdateDialog: vi.fn(),
    closeUpdateDialog: vi.fn(),
    setUpdateDialog: vi.fn((update) => {
      calls.push(update);
    }),
  };
}

describe("checkForUpdatesAndApply", () => {
  beforeEach(() => {
    check.mockReset();
    relaunch.mockReset();
    isTauri.mockReturnValue(true);
    delete window.__paintUpdaterMock;
    vi.unstubAllEnvs();
  });

  it("opens dialog and enters checking phase before calling updater", async () => {
    check.mockImplementation(() => new Promise(() => {}));
    const dialog = createDialog();

    const pending = checkForUpdatesAndApply(dialog);
    await Promise.resolve();

    expect(dialog.openUpdateDialog).toHaveBeenCalled();
    expect(dialog.calls[0]).toEqual({
      phase: "checking",
      message: `Checking for updates (installed version ${APP_VERSION})…`,
    });
    expect(check).toHaveBeenCalledWith({ allowDowngrades: false });
    void pending;
  });

  it("shows up to date when check returns null", async () => {
    check.mockResolvedValue(null);
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("up_to_date");
    expect(dialog.calls.at(-1)?.message).toContain(APP_VERSION);
    expect(relaunch).not.toHaveBeenCalled();
  });

  it("shows up to date when remote version equals installed", async () => {
    check.mockResolvedValue({
      version: APP_VERSION,
      downloadAndInstall: vi.fn(),
    });
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("up_to_date");
    expect(dialog.calls.at(-1)?.message).toBe(
      `${APP_NAME} is up to date (version ${APP_VERSION}).`
    );
  });

  it("shows up to date when remote version is older", async () => {
    check.mockResolvedValue({
      version: "0.9.0",
      downloadAndInstall: vi.fn(),
    });
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("up_to_date");
  });

  it("downloads, installs, and relaunches when a newer version is available", async () => {
    const installed = parseSemver(APP_VERSION) ?? [1, 0, 0];
    const newerVersion = `${installed[0]}.${installed[1]}.${installed[2] + 1}`;
    const downloadEvents: string[] = [];
    const downloadAndInstall = vi.fn(async (onEvent) => {
      onEvent?.({ event: "Started" });
      onEvent?.({ event: "Finished" });
      downloadEvents.push("done");
    });
    check.mockResolvedValue({
      version: newerVersion,
      downloadAndInstall,
    });
    relaunch.mockResolvedValue(undefined);
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(downloadAndInstall).toHaveBeenCalled();
    expect(downloadEvents).toEqual(["done"]);
    expect(relaunch).toHaveBeenCalled();
    expect(dialog.calls.map((c) => c.phase)).toEqual([
      "checking",
      "downloading",
      "installing",
    ]);
    expect(dialog.calls[1]?.message).toMatch(new RegExp(newerVersion));
  });

  it("shows feed-unavailable guidance for missing release JSON", async () => {
    check.mockRejectedValue(
      new Error("Could not fetch a valid release JSON from the remote")
    );
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toBe(UPDATE_FEED_UNAVAILABLE_MESSAGE);
  });

  it.each([
    "failed to fetch latest.json",
    "HTTP 404",
    "release not found",
  ])("maps feed errors: %s", async (errorText) => {
    check.mockRejectedValue(new Error(errorText));
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.message).toBe(UPDATE_FEED_UNAVAILABLE_MESSAGE);
  });

  it("shows platform guidance when latest.json lacks windows-aarch64", async () => {
    check.mockRejectedValue(
      new Error(
        'None of the fallback platforms `["windows-aarch64"]` were found in the response `platforms` object'
      )
    );
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toBe(UNSUPPORTED_PLATFORM_MESSAGE);
  });

  it("shows generic error for other failures", async () => {
    check.mockRejectedValue(new Error("network down"));
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toBe("Update check failed: network down");
  });

  it("handles non-Error throws", async () => {
    check.mockRejectedValue("plain string failure");
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.message).toBe(
      "Update check failed: plain string failure"
    );
  });

  it("surfaces download failures without relaunching", async () => {
    const installed = parseSemver(APP_VERSION) ?? [1, 0, 0];
    const newerVersion = `${installed[0]}.${installed[1]}.${installed[2] + 1}`;
    check.mockResolvedValue({
      version: newerVersion,
      downloadAndInstall: vi.fn().mockRejectedValue(new Error("checksum mismatch")),
    });
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(relaunch).not.toHaveBeenCalled();
    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toMatch(/checksum mismatch/i);
  });

  it("rejects browser-only usage", async () => {
    isTauri.mockReturnValue(false);
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(check).not.toHaveBeenCalled();
    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toMatch(/installed desktop application/i);
  });

  it("short-circuits in VITE_E2E mode", async () => {
    vi.stubEnv("VITE_E2E", "true");
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(check).not.toHaveBeenCalled();
    expect(dialog.calls.at(-1)?.phase).toBe("up_to_date");
  });

  it("uses window.__paintUpdaterMock when VITE_TAURI_MOCK is enabled", async () => {
    vi.stubEnv("VITE_TAURI_MOCK", "1");
    const mockCheck = vi.fn().mockResolvedValue(null);
    const mockRelaunch = vi.fn();
    window.__paintUpdaterMock = {
      check: mockCheck,
      relaunch: mockRelaunch,
    };
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(mockCheck).toHaveBeenCalledWith({ allowDowngrades: false });
    expect(check).not.toHaveBeenCalled();
    expect(mockRelaunch).not.toHaveBeenCalled();
  });

  it("logs update lifecycle events", async () => {
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    check.mockResolvedValue(null);
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    const combined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(combined).toMatch(/update/i);
    logSpy.mockRestore();
  });
});
