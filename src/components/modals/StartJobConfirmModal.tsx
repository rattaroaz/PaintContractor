import { useState } from "react";
import { api } from "../../api";
import { useNotification } from "../../context/NotificationContext";
import type { Invoice } from "../../types";
import { formatDate, formatInvoiceNumber } from "../../utils/format";
import { InvoiceStatus, jobNamesFromChoice } from "../../utils/invoice";
import { Modal } from "../Modal";

interface StartJobConfirmModalProps {
  show: boolean;
  invoice: Invoice | null;
  onClose: (saved: boolean) => void;
}

export function StartJobConfirmModal({
  show,
  invoice,
  onClose,
}: StartJobConfirmModalProps) {
  const { success, error } = useNotification();
  const [saving, setSaving] = useState(false);

  if (!invoice) return null;

  const jobs = jobNamesFromChoice(invoice.job_description_choice);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const draft: Invoice = {
        ...invoice,
        status: InvoiceStatus.Draft,
        contractor_name: invoice.contractor_name || "N/A",
      };
      const result = await api.addInvoice(draft);
      if (result.success) {
        success("Work order saved as draft invoice.");
        onClose(true);
      } else {
        error(result.message || "Failed to save draft.");
        onClose(false);
      }
    } catch (e) {
      error(String(e));
      onClose(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Job Confirmation"
      onClose={() => onClose(false)}
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onClose(false)}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </>
      }
    >
      <dl className="row mb-0">
        <dt className="col-sm-4">Today's Date</dt>
        <dd className="col-sm-8">{formatDate(invoice.todays_date)}</dd>
        <dt className="col-sm-4">Work Date</dt>
        <dd className="col-sm-8">{formatDate(invoice.work_date)}</dd>
        <dt className="col-sm-4">Company</dt>
        <dd className="col-sm-8">{invoice.company_name}</dd>
        <dt className="col-sm-4">Property</dt>
        <dd className="col-sm-8">{invoice.property_address}</dd>
        <dt className="col-sm-4">Unit</dt>
        <dd className="col-sm-8">{invoice.unit}</dd>
        <dt className="col-sm-4">Bed / Bath</dt>
        <dd className="col-sm-8">
          {invoice.size_bedroom} / {invoice.size_bathroom}
        </dd>
        <dt className="col-sm-4">Jobs</dt>
        <dd className="col-sm-8">{jobs.join(", ") || "—"}</dd>
        <dt className="col-sm-4">Amount</dt>
        <dd className="col-sm-8">${invoice.amount_cost}</dd>
        {invoice.special_note && (
          <>
            <dt className="col-sm-4">Note</dt>
            <dd className="col-sm-8">{invoice.special_note}</dd>
          </>
        )}
      </dl>
      <p className="text-muted small mt-3 mb-0">
        Invoice # will be assigned after save (
        {invoice.id ? formatInvoiceNumber(invoice.id) : "new"}).
      </p>
    </Modal>
  );
}
