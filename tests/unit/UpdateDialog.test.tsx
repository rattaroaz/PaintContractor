import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpdateDialog } from "../../src/components/UpdateDialog";
import {
  UpdateDialogProvider,
  useUpdateDialog,
} from "../../src/context/UpdateDialogContext";

function OpenCheckingDialog() {
  const { openUpdateDialog } = useUpdateDialog();
  useEffect(() => {
    openUpdateDialog();
  }, [openUpdateDialog]);
  return null;
}

describe("UpdateDialog", () => {
  it("renders checking title when dialog is open", () => {
    render(
      <UpdateDialogProvider>
        <OpenCheckingDialog />
        <UpdateDialog />
      </UpdateDialogProvider>
    );

    expect(
      screen.getByRole("heading", { name: /checking for updates/i })
    ).toBeInTheDocument();
  });

  it("shows close button when up to date", () => {
    function OpenUpToDate() {
      const { setUpdateDialog } = useUpdateDialog();
      useEffect(() => {
        setUpdateDialog({ phase: "up_to_date", message: "Up to date." });
      }, [setUpdateDialog]);
      return null;
    }

    render(
      <UpdateDialogProvider>
        <OpenUpToDate />
        <UpdateDialog />
      </UpdateDialogProvider>
    );

    expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
  });
});
