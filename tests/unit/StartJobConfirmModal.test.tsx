import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mockInvoke, resetInvokeMock, getInvokeCallsFor } from "../helpers/tauri-mock";
import { NotificationProvider } from "../../src/context/NotificationContext";
import { StartJobConfirmModal } from "../../src/components/modals/StartJobConfirmModal";
import { makeInvoice } from "../helpers/fixtures";

beforeEach(() => {
  resetInvokeMock();
});

function renderModal(opts: {
  show?: boolean;
  invoice?: ReturnType<typeof makeInvoice> | null;
  onClose?: (ok: boolean) => void;
} = {}) {
  const invoice = "invoice" in opts ? opts.invoice ?? null : makeInvoice();
  return render(
    <NotificationProvider>
      <StartJobConfirmModal
        show={opts.show ?? true}
        invoice={invoice as ReturnType<typeof makeInvoice> | null}
        onClose={opts.onClose ?? (() => undefined)}
      />
    </NotificationProvider>
  );
}

describe("StartJobConfirmModal", () => {
  it("returns null when no invoice is provided", () => {
    renderModal({ invoice: null });
    expect(screen.queryByText("Job Confirmation")).not.toBeInTheDocument();
  });

  it("renders the invoice summary fields", () => {
    renderModal({ invoice: makeInvoice({ company_name: "Acme Co" }) });
    expect(screen.getByText("Job Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
  });

  it("calls add_invoice on submit and reports success", async () => {
    mockInvoke("add_invoice", async () => ({
      success: true,
      data: makeInvoice({ id: 42 }),
    }));
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(getInvokeCallsFor("add_invoice")).toHaveLength(1);
  });

  it("shows an error and closes with false on failure", async () => {
    mockInvoke("add_invoice", async () => ({
      success: false,
      message: "bad data",
    }));
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(false));
    expect(screen.getByText("bad data")).toBeInTheDocument();
  });

  it("can be cancelled via the Back button", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("submits with status=Draft and defaults missing contractor", async () => {
    mockInvoke("add_invoice", async (args) => ({
      success: true,
      data: (args as { invoice: { id: number } }).invoice,
    }));
    renderModal({
      invoice: makeInvoice({ contractor_name: "" }),
      onClose: () => undefined,
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(getInvokeCallsFor("add_invoice")).toHaveLength(1));
    const args = getInvokeCallsFor("add_invoice")[0] as {
      invoice: { status: number; contractor_name: string };
    };
    expect(args.invoice.status).toBe(0);
    expect(args.invoice.contractor_name).toBe("N/A");
  });
});
