import type { ReactNode } from "react";
import { Modal } from "./Modal";
import type { Invoice } from "../types";
import { formatDate, formatInvoiceNumber } from "../utils/format";
import { InvoiceStatus, jobNamesFromChoice } from "../utils/invoice";

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const empty =
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value));
  return (
    <div className="col-md-6 col-lg-4 mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{empty ? "—" : value}</div>
    </div>
  );
}

function statusLabel(status: number): string {
  switch (status) {
    case InvoiceStatus.Draft:
      return "Draft";
    case InvoiceStatus.Submitted:
      return "Submitted";
    case InvoiceStatus.Paid:
      return "Paid";
    default:
      return String(status);
  }
}

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  const daysOverdue =
    invoice && "days_overdue" in invoice
      ? (invoice as Invoice & { days_overdue: number }).days_overdue
      : undefined;

  const jobs = invoice
    ? jobNamesFromChoice(invoice.job_description_choice).join(", ")
    : "";

  return (
    <Modal
      show={invoice != null}
      title={
        invoice ? `Invoice ${formatInvoiceNumber(invoice.id)}` : "Invoice details"
      }
      onClose={onClose}
      size="lg"
    >
      {invoice && (
        <div className="row">
          <DetailField
            label="Invoice Number"
            value={formatInvoiceNumber(invoice.id)}
          />
          <DetailField label="Status" value={statusLabel(invoice.status)} />
          <DetailField
            label="Today's Date"
            value={formatDate(invoice.todays_date)}
          />
          <DetailField
            label="Work Date"
            value={formatDate(invoice.work_date)}
          />
          <DetailField
            label="Invoice Created"
            value={
              invoice.invoice_created_date
                ? formatDate(invoice.invoice_created_date)
                : null
            }
          />
          {daysOverdue != null && (
            <DetailField label="Days Overdue" value={daysOverdue} />
          )}
          <DetailField label="Company" value={invoice.company_name} />
          <DetailField label="Property Address" value={invoice.property_address} />
          <DetailField label="Unit" value={invoice.unit} />
          <DetailField label="Gate Code" value={invoice.gate_code} />
          <DetailField label="Lock Box" value={invoice.lock_box} />
          <DetailField
            label="Garage Remote Code"
            value={invoice.garage_remote_code}
          />
          <DetailField label="Bedrooms" value={invoice.size_bedroom} />
          <DetailField label="Bathrooms" value={invoice.size_bathroom} />
          <DetailField label="Work Order" value={invoice.work_order} />
          <DetailField label="Job Description" value={jobs || invoice.job_description_choice} />
          <DetailField label="Contractor" value={invoice.contractor_name} />
          <DetailField label="Amount Cost" value={invoice.amount_cost} />
          <DetailField label="Amount Paid 1" value={invoice.amount_paid1} />
          <DetailField
            label="Date Paid 1"
            value={
              invoice.date_paid1 ? formatDate(invoice.date_paid1) : null
            }
          />
          <DetailField label="Check Number 1" value={invoice.check_number1} />
          <DetailField label="Amount Paid 2" value={invoice.amount_paid2} />
          <DetailField
            label="Date Paid 2"
            value={
              invoice.date_paid2 ? formatDate(invoice.date_paid2) : null
            }
          />
          <DetailField label="Check Number 2" value={invoice.check_number2} />
          <div className="col-12 mb-3">
            <div className="text-muted small mb-1">Special Note</div>
            <div className="fw-medium" style={{ whiteSpace: "pre-wrap" }}>
              {invoice.special_note?.trim() ? invoice.special_note : "—"}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
