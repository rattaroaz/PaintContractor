import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DataTable, type DataColumn } from "../components/DataTable";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { Contractor, Invoice } from "../types";
import { formatDate, formatInvoiceNumber } from "../utils/format";
import {
  filterByContractor,
  filterByDateRange,
  invoiceToExportRow,
} from "../utils/invoice";
import { exportExcel, exportPdf } from "../utils/exportActions";

export function PayrollPage() {
  const { success, error } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractor, setContractor] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sales, contractorList] = await Promise.all([
          api.getInvoicesSales(),
          api.getAllContractors(),
        ]);
        setInvoices(sales);
        setContractors(contractorList);
      } catch (e) {
        error(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [error]);

  const contractorNames = useMemo(
    () => contractors.map((c) => c.name).sort(),
    [contractors]
  );

  const filtered = useMemo(() => {
    if (!contractor) return [];
    let list = filterByDateRange(
      invoices,
      startDate || undefined,
      endDate || undefined
    );
    list = filterByContractor(list, contractor);
    return list;
  }, [invoices, startDate, endDate, contractor]);

  const columns: DataColumn<Invoice>[] = [
    {
      key: "work_date",
      title: "Work Date",
      sortable: true,
      render: (r) => formatDate(r.work_date),
    },
    {
      key: "id",
      title: "Invoice Number",
      sortable: true,
      render: (r) => formatInvoiceNumber(r.id),
    },
    { key: "amount_cost", title: "Invoice Total", sortable: true },
    { key: "amount_paid1", title: "Paid to Contractor", sortable: true },
    { key: "amount_paid2", title: "Paid to Contractor2", sortable: true },
  ];

  return (
    <div className="container-fluid">
      <PageTitle title="Payroll" icon="💰" />
      <div className="card-section">
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Contractor *</label>
            <select
              className="form-select"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
            >
              <option value="">Select contractor…</option>
              {contractorNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="alert alert-info">Loading…</div>}
        {!contractor && !loading && (
          <p className="text-muted">Select a contractor to view payroll data.</p>
        )}
        {contractor && (
          <>
            <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} />
            <div className="mt-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => {
                  const data = filtered.map((inv) =>
                    invoiceToExportRow(inv, formatInvoiceNumber, formatDate)
                  );
                  void exportPdf(data, "Payroll", error, success);
                }}
              >
                Download PDF
              </button>
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={() => {
                  const data = filtered.map((inv) =>
                    invoiceToExportRow(inv, formatInvoiceNumber, formatDate)
                  );
                  void exportExcel(data, "Payroll.xlsx", error, success);
                }}
              >
                Download Excel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
