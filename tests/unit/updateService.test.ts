import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForUpdatesAndApply } from "../../src/services/updateService";
import type { UpdateDialogApi } from "../../src/context/UpdateDialogContext";
import { APP_VERSION } from "../../src/lib/constants";
import { parseSemver } from "../../src/lib/semver";

const check = vi.fn();
const relaunch = vi.fn();

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: (...args: unknown[]) => check(...args),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: (...args: unknown[]) => relaunch(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
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
  });

  it("shows up to date when check returns null", async () => {
    check.mockResolvedValue(null);
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("up_to_date");
    expect(relaunch).not.toHaveBeenCalled();
  });

  it("shows up to date when remote version is not newer", async () => {
    check.mockResolvedValue({
      version: "1.0.0",
      downloadAndInstall: vi.fn(),
    });
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("up_to_date");
  });

  it("downloads and relaunches when a newer version is available", async () => {
    const installed = parseSemver(APP_VERSION) ?? [1, 0, 0];
    const newerVersion = `${installed[0]}.${installed[1]}.${installed[2] + 1}`;
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    check.mockResolvedValue({
      version: newerVersion,
      downloadAndInstall,
    });
    relaunch.mockResolvedValue(undefined);
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(downloadAndInstall).toHaveBeenCalled();
    expect(relaunch).toHaveBeenCalled();
    expect(dialog.calls.some((c) => c.phase === "downloading")).toBe(true);
  });

  it("shows feed-unavailable guidance for missing release JSON", async () => {
    check.mockRejectedValue(
      new Error("Could not fetch a valid release JSON from the remote")
    );
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toMatch(/no update feed is published/i);
  });

  it("shows generic error for other failures", async () => {
    check.mockRejectedValue(new Error("network down"));
    const dialog = createDialog();

    await checkForUpdatesAndApply(dialog);

    expect(dialog.calls.at(-1)?.phase).toBe("error");
    expect(dialog.calls.at(-1)?.message).toMatch(/network down/i);
  });
});
