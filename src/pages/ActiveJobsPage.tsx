import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DataTable, type DataColumn } from "../components/DataTable";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { Invoice } from "../types";
import { formatDate, formatInvoiceNumber } from "../utils/format";
import {
  buildCompanyNames,
  filterByCompany,
  filterByDateRange,
  invoiceToExportRow,
  VIEW_ALL,
} from "../utils/invoice";
import { exportExcel, exportPdf } from "../utils/exportActions";

export function ActiveJobsPage() {
  const { success, error } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [company, setCompany] = useState(VIEW_ALL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoicesActive();
      setInvoices(data);
    } catch (e) {
      error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const companies = useMemo(() => buildCompanyNames(invoices), [invoices]);

  const filtered = useMemo(() => {
    let list = filterByDateRange(invoices, startDate || undefined, endDate || undefined);
    list = filterByCompany(list, company);
    return list;
  }, [invoices, startDate, endDate, company]);

  const columns: DataColumn<Invoice>[] = [
    {
      key: "id",
      title: "Invoice #",
      sortable: true,
      render: (r) => formatInvoiceNumber(r.id),
    },
    {
      key: "work_date",
      title: "Work Date",
      sortable: true,
      render: (r) => formatDate(r.work_date),
    },
    { key: "company_name", title: "Company", sortable: true },
    { key: "property_address", title: "Address", sortable: true },
    { key: "unit", title: "Unit", sortable: true },
    { key: "amount_cost", title: "Amount", sortable: true },
    { key: "contractor_name", title: "Contractor", sortable: true },
  ];

  const exportData = () =>
    filtered.map((inv) =>
      invoiceToExportRow(inv, formatInvoiceNumber, formatDate)
    );

  return (
    <div className="container-fluid">
      <PageTitle title="Active Jobs" icon="🔧" />
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
            <label className="form-label">Company</label>
            <select
              className="form-select"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="alert alert-info">Loading active jobs…</div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(r) => r.id}
            />
            <div className="mt-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() =>
                  void exportPdf(exportData(), "Active_Jobs", error, success)
                }
              >
                Download PDF
              </button>
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={() =>
                  void exportExcel(
                    exportData(),
                    "Active_Jobs.xlsx",
                    error,
                    success
                  )
                }
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
