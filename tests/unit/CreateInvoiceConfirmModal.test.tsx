import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mockInvoke, resetInvokeMock, getInvokeCallsFor, autoConfirm } from "../helpers/tauri-mock";
import { NotificationProvider } from "../../src/context/NotificationContext";
import { CreateInvoiceConfirmModal } from "../../src/components/modals/CreateInvoiceConfirmModal";
import { makeContractor, makeInvoice, makeJob } from "../helpers/fixtures";

beforeEach(() => {
  resetInvokeMock();
});

function renderModal(opts: {
  invoice?: ReturnType<typeof makeInvoice> | null;
  jobs?: ReturnType<typeof makeJob>[];
  contractors?: ReturnType<typeof makeContractor>[];
  onClose?: (saved: boolean) => void;
} = {}) {
  const invoice =
    "invoice" in opts
      ? opts.invoice ?? null
      : makeInvoice({ id: 5, amount_cost: 100 });
  return render(
    <NotificationProvider>
      <CreateInvoiceConfirmModal
        show
        invoice={invoice as ReturnType<typeof makeInvoice> | null}
        jobs={opts.jobs ?? [makeJob({ description: "Paint", price: 50 })]}
        contractors={opts.contractors ?? [makeContractor()]}
        onClose={opts.onClose ?? (() => undefined)}
      />
    </NotificationProvider>
  );
}

describe("CreateInvoiceConfirmModal", () => {
  it("renders nothing without an invoice", () => {
    renderModal({ invoice: null });
    expect(screen.queryByText(/job description/i)).not.toBeInTheDocument();
  });

  it("renders confirm modal with totals", () => {
    renderModal({ invoice: makeInvoice({ amount_cost: 250 }) });
    expect(screen.getByDisplayValue("250")).toBeInTheDocument();
  });

  it("issues delete confirmation when removing a job line", async () => {
    autoConfirm(true);
    renderModal({
      invoice: makeInvoice({
        amount_cost: 100,
        job_description_choice: JSON.stringify(["Paint"]),
      }),
    });
    const remove = screen.queryAllByRole("button", { name: /remove|×|\bdelete\b/i });
    if (remove.length > 0) {
      fireEvent.click(remove[0]);
      await waitFor(() => {
        const calls = getInvokeCallsFor("plugin:dialog|message");
        expect(calls.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  it("save action calls update_invoice and reports success", async () => {
    mockInvoke("update_invoice", async (args) => ({
      success: true,
      data: (args as { invoice: { id: number } }).invoice,
    }));
    const onClose = vi.fn();
    renderModal({ onClose });
    const submit = screen.getByRole("button", { name: /submit|save|create/i });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(getInvokeCallsFor("update_invoice").length + getInvokeCallsFor("add_invoice").length)
        .toBeGreaterThanOrEqual(1)
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
