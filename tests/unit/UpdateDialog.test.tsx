import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateDialog } from "../../src/components/UpdateDialog";
import {
  UpdateDialogProvider,
  useUpdateDialog,
  type UpdateDialogPhase,
} from "../../src/context/UpdateDialogContext";

function SetPhase({
  phase,
  message,
}: {
  phase: UpdateDialogPhase;
  message: string;
}) {
  const { setUpdateDialog } = useUpdateDialog();
  useEffect(() => {
    setUpdateDialog({ phase, message });
  }, [phase, message, setUpdateDialog]);
  return null;
}

describe("UpdateDialog", () => {
  it("is hidden while idle", () => {
    render(
      <UpdateDialogProvider>
        <UpdateDialog />
      </UpdateDialogProvider>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["checking", /checking for updates/i],
    ["downloading", /downloading update/i],
    ["installing", /installing update/i],
    ["up_to_date", /up to date/i],
    ["error", /update error/i],
  ] as const)("renders %s title", (phase, titlePattern) => {
    render(
      <UpdateDialogProvider>
        <SetPhase phase={phase} message={`${phase} body`} />
        <UpdateDialog />
      </UpdateDialogProvider>
    );

    expect(screen.getByRole("heading", { name: titlePattern })).toBeInTheDocument();
    expect(screen.getByText(`${phase} body`)).toBeInTheDocument();
  });

  it.each(["checking", "downloading", "installing"] as const)(
    "blocks close while %s",
    async (phase) => {
      render(
        <UpdateDialogProvider>
          <SetPhase phase={phase} message="busy" />
          <UpdateDialog />
        </UpdateDialogProvider>
      );

      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
      expect(screen.getByText(/please wait while the update completes/i)).toBeInTheDocument();
    }
  );

  it("allows close when up to date", async () => {
    const user = userEvent.setup();
    render(
      <UpdateDialogProvider>
        <SetPhase phase="up_to_date" message="All good." />
        <UpdateDialog />
      </UpdateDialogProvider>
    );

    await user.click(screen.getByLabelText(/close/i));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows close after an error", async () => {
    const user = userEvent.setup();
    render(
      <UpdateDialogProvider>
        <SetPhase phase="error" message="Feed missing." />
        <UpdateDialog />
      </UpdateDialogProvider>
    );

    await user.click(screen.getByLabelText(/close/i));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
