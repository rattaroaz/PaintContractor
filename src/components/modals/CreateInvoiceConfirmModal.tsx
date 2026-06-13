import { useEffect, useState } from "react";
import { api } from "../../api";
import { useNotification } from "../../context/NotificationContext";
import type { Contractor, Invoice, JobDescription } from "../../types";
import { todayIsoDate } from "../../utils/format";
import { confirmDelete } from "../../utils/confirm";
import { uniqueJobDescriptions } from "../../utils/jobs";
import {
  buildJobDescriptionChoice,
  calcAmountFromJobs,
  InvoiceStatus,
  jobNamesFromChoice,
} from "../../utils/invoice";
import { FormSelect } from "../FormSelect";
import { Modal } from "../Modal";

interface CreateInvoiceConfirmModalProps {
  show: boolean;
  invoice: Invoice | null;
  jobs: JobDescription[];
  contractors: Contractor[];
  onClose: (saved: boolean) => void;
}

export function CreateInvoiceConfirmModal({
  show,
  invoice: initial,
  jobs,
  contractors,
  onClose,
}: CreateInvoiceConfirmModalProps) {
  const { success, error } = useNotification();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [jobLines, setJobLines] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setInvoice({ ...initial });
      setJobLines(jobNamesFromChoice(initial.job_description_choice));
    }
  }, [initial]);

  if (!invoice) return null;

  const activeContractors = contractors
    .filter((c) => c.is_active !== false)
    .map((c) => c.name);

  const jobOptions = uniqueJobDescriptions(jobs);

  const recalc = (lines: string[], inv: Invoice) => {
    const choice = buildJobDescriptionChoice(lines);
    const amount = calcAmountFromJobs(
      choice,
      jobs,
      inv.size_bedroom,
      inv.size_bathroom
    );
    setInvoice({
      ...inv,
      job_description_choice: choice,
      amount_cost: amount,
    });
  };

  const updateLine = (idx: number, value: string) => {
    const next = [...jobLines];
    next[idx] = value;
    setJobLines(next);
    recalc(next, invoice);
  };

  const addLine = () => {
    const next = [...jobLines, ""];
    setJobLines(next);
  };

  const removeLine = async (idx: number) => {
    if (!(await confirmDelete())) return;
    const next = jobLines.filter((_, i) => i !== idx);
    setJobLines(next);
    recalc(next, invoice);
  };

  const patchInvoice = (patch: Partial<Invoice>) => {
    setInvoice((inv) => {
      if (!inv) return inv;
      const next = { ...inv, ...patch };
      if (
        "size_bedroom" in patch ||
        "size_bathroom" in patch
      ) {
        const amount = calcAmountFromJobs(
          next.job_description_choice,
          jobs,
          next.size_bedroom,
          next.size_bathroom
        );
        next.amount_cost = amount;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!invoice.contractor_name || invoice.contractor_name === "N/A") {
      error("Please select a contractor.");
      return;
    }
    setSaving(true);
    try {
      const submitted: Invoice = {
        ...invoice,
        status: InvoiceStatus.Submitted,
        invoice_created_date: todayIsoDate(),
      };
      const result = await api.updateInvoice(submitted);
      if (result.success) {
        success("Invoice submitted successfully.");
        onClose(true);
      } else {
        error(result.message || "Failed to submit invoice.");
      }
    } catch (e) {
      error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Confirm Invoice"
      onClose={() => onClose(false)}
      size="xl"
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
            className="btn btn-success"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Submitting…" : "Submit"}
          </button>
        </>
      }
    >
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Today's Date</label>
          <input
            type="date"
            className="form-control"
            value={invoice.todays_date}
            onChange={(e) =>
              setInvoice({ ...invoice, todays_date: e.target.value })
            }
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Work Date</label>
          <input
            type="date"
            className="form-control"
            value={invoice.work_date}
            onChange={(e) =>
              setInvoice({ ...invoice, work_date: e.target.value })
            }
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Amount Cost</label>
          <input
            type="number"
            className="form-control"
            value={invoice.amount_cost}
            onChange={(e) =>
              setInvoice({
                ...invoice,
                amount_cost: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Company</label>
          <input
            type="text"
            className="form-control"
            value={invoice.company_name}
            onChange={(e) =>
              setInvoice({ ...invoice, company_name: e.target.value })
            }
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Property Address</label>
          <input
            type="text"
            className="form-control"
            value={invoice.property_address}
            onChange={(e) =>
              setInvoice({ ...invoice, property_address: e.target.value })
            }
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Unit</label>
          <input
            type="text"
            className="form-control"
            value={invoice.unit}
            onChange={(e) => setInvoice({ ...invoice, unit: e.target.value })}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Bedrooms</label>
          <input
            type="number"
            min={0}
            max={20}
            className="form-control"
            value={invoice.size_bedroom}
            onChange={(e) =>
              patchInvoice({
                size_bedroom: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Bathrooms</label>
          <input
            type="number"
            min={0}
            max={20}
            className="form-control"
            value={invoice.size_bathroom}
            onChange={(e) =>
              patchInvoice({
                size_bathroom: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Work Order</label>
          <input
            type="text"
            className="form-control"
            value={invoice.work_order ?? ""}
            onChange={(e) =>
              setInvoice({ ...invoice, work_order: e.target.value })
            }
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Contractor</label>
          <FormSelect
            options={activeContractors}
            value={invoice.contractor_name}
            onChange={(v) =>
              setInvoice({ ...invoice, contractor_name: v })
            }
            placeholder="Select…"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Gate Code</label>
          <input
            type="text"
            className="form-control"
            value={invoice.gate_code ?? ""}
            onChange={(e) =>
              setInvoice({ ...invoice, gate_code: e.target.value })
            }
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Lock Box</label>
          <input
            type="text"
            className="form-control"
            value={invoice.lock_box ?? ""}
            onChange={(e) =>
              setInvoice({ ...invoice, lock_box: e.target.value })
            }
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Garage Remote</label>
          <input
            type="text"
            className="form-control"
            value={invoice.garage_remote_code ?? ""}
            onChange={(e) =>
              setInvoice({ ...invoice, garage_remote_code: e.target.value })
            }
          />
        </div>
        <div className="col-12">
          <label className="form-label">Special Note</label>
          <textarea
            className="form-control"
            rows={2}
            value={invoice.special_note ?? ""}
            onChange={(e) =>
              setInvoice({ ...invoice, special_note: e.target.value })
            }
          />
        </div>
        <div className="col-12">
          <label className="form-label">Job Descriptions</label>
          {jobLines.map((line, idx) => (
            <div key={idx} className="input-group mb-2">
              <FormSelect
                options={jobOptions}
                value={line}
                onChange={(v) => updateLine(idx, v)}
                placeholder="Select…"
              />
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => void removeLine(idx)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={addLine}
          >
            Add job line
          </button>
        </div>
      </div>
    </Modal>
  );
}
