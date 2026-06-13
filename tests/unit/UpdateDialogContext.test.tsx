import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  UpdateDialogProvider,
  useUpdateDialog,
  type UpdateDialogPhase,
} from "../../src/context/UpdateDialogContext";

function Probe() {
  const api = useUpdateDialog();
  return (
    <div>
      <span data-testid="show">{String(api.showUpdateDialog)}</span>
      <span data-testid="phase">{api.updatePhase}</span>
      <span data-testid="message">{api.updateMessage}</span>
      <button type="button" onClick={() => api.openUpdateDialog()}>
        Open
      </button>
      <button type="button" onClick={() => api.closeUpdateDialog()}>
        Close
      </button>
      <button
        type="button"
        onClick={() =>
          api.setUpdateDialog({ phase: "error", message: "Boom" })
        }
      >
        Error
      </button>
    </div>
  );
}

describe("UpdateDialogContext", () => {
  it("starts hidden in idle phase", () => {
    render(
      <UpdateDialogProvider>
        <Probe />
      </UpdateDialogProvider>
    );

    expect(screen.getByTestId("show").textContent).toBe("false");
    expect(screen.getByTestId("phase").textContent).toBe("idle");
  });

  it("openUpdateDialog shows checking state", async () => {
    const user = userEvent.setup();
    render(
      <UpdateDialogProvider>
        <Probe />
      </UpdateDialogProvider>
    );

    await user.click(screen.getByRole("button", { name: /^open$/i }));

    expect(screen.getByTestId("show").textContent).toBe("true");
    expect(screen.getByTestId("phase").textContent).toBe("checking");
    expect(screen.getByTestId("message").textContent).toMatch(
      /checking for updates/i
    );
  });

  it("setUpdateDialog replaces phase and message", async () => {
    const user = userEvent.setup();
    render(
      <UpdateDialogProvider>
        <Probe />
      </UpdateDialogProvider>
    );

    await user.click(screen.getByRole("button", { name: /^error$/i }));

    expect(screen.getByTestId("phase").textContent).toBe("error");
    expect(screen.getByTestId("message").textContent).toBe("Boom");
  });

  it("closeUpdateDialog resets to idle", async () => {
    const user = userEvent.setup();
    render(
      <UpdateDialogProvider>
        <Probe />
      </UpdateDialogProvider>
    );

    await user.click(screen.getByRole("button", { name: /^open$/i }));
    await user.click(screen.getByRole("button", { name: /^close$/i }));

    expect(screen.getByTestId("show").textContent).toBe("false");
    expect(screen.getByTestId("phase").textContent).toBe("idle");
    expect(screen.getByTestId("message").textContent).toBe("");
  });

  it.each<UpdateDialogPhase>([
    "checking",
    "downloading",
    "installing",
    "up_to_date",
    "error",
  ])("accepts phase %s", (phase) => {
    function SetPhase() {
      const { setUpdateDialog } = useUpdateDialog();
      return (
        <button
          type="button"
          onClick={() => setUpdateDialog({ phase, message: `${phase} msg` })}
        >
          Set
        </button>
      );
    }

    render(
      <UpdateDialogProvider>
        <SetPhase />
        <Probe />
      </UpdateDialogProvider>
    );

    act(() => {
      screen.getByRole("button", { name: /^set$/i }).click();
    });

    expect(screen.getByTestId("phase").textContent).toBe(phase);
    expect(screen.getByTestId("message").textContent).toBe(`${phase} msg`);
  });
});
