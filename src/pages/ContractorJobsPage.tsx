import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DataTable, type DataColumn } from "../components/DataTable";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { Invoice } from "../types";
import { formatDate, formatInvoiceNumber, todayIsoDate } from "../utils/format";
import { filterByWorkDate, jobNamesFromChoice } from "../utils/invoice";
import { exportExcel, exportPdf } from "../utils/exportActions";

export function ContractorJobsPage() {
  const { success, error } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchDate, setSearchDate] = useState(todayIsoDate());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getInvoicesSales();
        setInvoices(data);
      } catch (e) {
        error(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [error]);

  const filtered = useMemo(
    () => filterByWorkDate(invoices, searchDate),
    [invoices, searchDate]
  );

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
    { key: "contractor_name", title: "Contractor", sortable: true },
    { key: "property_address", title: "Property", sortable: true },
    { key: "unit", title: "Unit", sortable: true },
    { key: "gate_code", title: "Gate Code", sortable: true },
    { key: "lock_box", title: "Lock Box", sortable: true },
    {
      key: "job_description_choice",
      title: "Job Description",
      render: (r) => jobNamesFromChoice(r.job_description_choice).join(", "),
    },
    { key: "work_order", title: "Work Order", sortable: true },
    { key: "amount_cost", title: "Price", sortable: true },
  ];

  const exportData = () =>
    filtered.map((r) => ({
      "Work Date": formatDate(r.work_date),
      "Invoice Number": formatInvoiceNumber(r.id),
      Contractor: r.contractor_name,
      Property: r.property_address,
      Unit: r.unit,
      "Gate Code": r.gate_code ?? "",
      "Lock Box": r.lock_box ?? "",
      Jobs: jobNamesFromChoice(r.job_description_choice).join(", "),
      "Work Order": r.work_order ?? "",
      Price: r.amount_cost,
    }));

  return (
    <div className="container-fluid">
      <PageTitle title="Contractor Jobs" icon="🏗" />
      <div className="card-section">
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Date to Search</label>
            <input
              type="date"
              className="form-control"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="alert alert-info">Loading…</div>
        ) : (
          <>
            <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} />
            <div className="mt-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() =>
                  void exportPdf(exportData(), "Contractor_Jobs", error, success)
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
                    "Contractor_Jobs.xlsx",
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
