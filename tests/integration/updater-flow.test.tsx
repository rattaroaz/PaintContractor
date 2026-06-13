import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../src/App";
import { AppProviders } from "../../src/context/AppProviders";
import { APP_VERSION } from "../../src/lib/constants";
import {
  UPDATE_FEED_UNAVAILABLE_MESSAGE,
  UNSUPPORTED_PLATFORM_MESSAGE,
} from "../../src/services/updateErrors";
import { parseSemver } from "../../src/lib/semver";
import { mockInvoke, resetInvokeMock } from "../helpers/tauri-mock";

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

function renderUpdatesApp() {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={["/settings/updates"]}>
        <App />
      </MemoryRouter>
    </AppProviders>
  );
}

async function clickCheckForUpdates(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /check for updates/i }));
}

describe("Updater end-to-end (Updates page + dialog)", () => {
  beforeEach(() => {
    check.mockReset();
    relaunch.mockReset();
    delete window.__paintUpdaterMock;
    resetInvokeMock();
    mockInvoke("get_app_logs", async () => {
      throw new Error("log files unavailable in test");
    });
  });

  it("shows installed version on the Updates page", () => {
    renderUpdatesApp();
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();
  });

  it("opens up-to-date dialog when no newer release exists", async () => {
    check.mockResolvedValue(null);
    const user = userEvent.setup();
    renderUpdatesApp();

    await clickCheckForUpdates(user);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /up to date/i })).toBeInTheDocument();
    expect(within(dialog).getByText(new RegExp(APP_VERSION))).toBeInTheDocument();
  });

  it("disables the button while checking", async () => {
    let resolveCheck: (value: null) => void = () => {};
    check.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolveCheck = resolve;
        })
    );
    const user = userEvent.setup();
    renderUpdatesApp();

    const button = screen.getByRole("button", { name: /check for updates/i });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/checking/i);

    resolveCheck(null);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("walks through download and install phases for a newer release", async () => {
    const installed = parseSemver(APP_VERSION) ?? [1, 0, 0];
    const newerVersion = `${installed[0]}.${installed[1]}.${installed[2] + 1}`;
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    check.mockResolvedValue({ version: newerVersion, downloadAndInstall });
    relaunch.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderUpdatesApp();
    await clickCheckForUpdates(user);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /installing update/i })
      ).toBeInTheDocument()
    );
    expect(downloadAndInstall).toHaveBeenCalled();
    expect(relaunch).toHaveBeenCalled();
  });

  it("shows feed-unavailable guidance in the dialog", async () => {
    check.mockRejectedValue(new Error("Could not fetch a valid release JSON"));
    const user = userEvent.setup();
    renderUpdatesApp();

    await clickCheckForUpdates(user);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(UPDATE_FEED_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/close/i)).toBeInTheDocument();
  });

  it("shows ARM64 platform guidance in the dialog", async () => {
    check.mockRejectedValue(
      new Error(
        'None of the fallback platforms `["windows-aarch64"]` were found in the response `platforms` object'
      )
    );
    const user = userEvent.setup();
    renderUpdatesApp();

    await clickCheckForUpdates(user);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(UNSUPPORTED_PLATFORM_MESSAGE)).toBeInTheDocument();
  });

  it("records update events in Show logs output", async () => {
    check.mockResolvedValue(null);
    const user = userEvent.setup();
    renderUpdatesApp();

    await clickCheckForUpdates(user);
    await screen.findByRole("heading", { name: /up to date/i });
    await user.click(screen.getByRole("button", { name: /show logs/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/update check started/i).length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(/update check: up to date/i).length).toBeGreaterThan(0);
  });

  it("filters update logs by error level after a failure", async () => {
    check.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderUpdatesApp();

    await clickCheckForUpdates(user);
    await screen.findByRole("heading", { name: /update error/i });
    await user.click(screen.getByRole("button", { name: /show logs/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/update check failed/i).length).toBeGreaterThan(0)
    );

    await user.selectOptions(screen.getByLabelText(/level/i), "error");
    expect(screen.getAllByText(/update check failed/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/update check: up to date/i)).not.toBeInTheDocument();
  });
});
