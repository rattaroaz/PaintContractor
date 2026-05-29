import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DataTable, type DataColumn } from "../components/DataTable";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { Company, Invoice } from "../types";
import type { ExInvoice } from "../utils/invoice";
import { formatDate, formatInvoiceNumber } from "../utils/format";
import {
  buildCompanyNames,
  filterByCompany,
  filterByDateRange,
  toExInvoice,
  VIEW_ALL,
} from "../utils/invoice";
import { exportExcel, exportPdf } from "../utils/exportActions";

export function AgingReportsPage() {
  const { success, error } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState(VIEW_ALL);
  const [supervisor, setSupervisor] = useState(VIEW_ALL);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailInvoice, setDetailInvoice] = useState<ExInvoice | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rec, comps] = await Promise.all([
          api.getInvoicesReceivable(),
          api.getAllCompanies(),
        ]);
        setInvoices(rec);
        setCompanies(comps);
      } catch (e) {
        error(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [error]);

  const companyNames = useMemo(() => buildCompanyNames(invoices), [invoices]);

  const supervisors = useMemo(() => {
    if (company === VIEW_ALL) return [VIEW_ALL];
    const comp = companies.find((c) => c.name === company);
    if (!comp) return [VIEW_ALL];
    return [VIEW_ALL, ...comp.supervisors.map((s) => s.name)];
  }, [company, companies]);

  const filtered: ExInvoice[] = useMemo(() => {
    let list = invoices.map(toExInvoice);
    list = filterByCompany(list, company) as ExInvoice[];
    if (supervisor !== VIEW_ALL && company !== VIEW_ALL) {
      list = list.filter((i) => i.company_name === company);
    }
    if (startDate && endDate) {
      list = filterByDateRange(list, startDate, endDate) as ExInvoice[];
    }
    return list;
  }, [invoices, company, supervisor, startDate, endDate]);

  const columns: DataColumn<ExInvoice>[] = [
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
    { key: "amount_cost", title: "Amount", sortable: true },
    { key: "days_overdue", title: "Days Overdue", sortable: true },
    { key: "property_address", title: "Property", sortable: true },
    { key: "contractor_name", title: "Contractor", sortable: true },
  ];

  const exportData = () =>
    filtered.map((r) => ({
      "Invoice Number": formatInvoiceNumber(r.id),
      "Work Date": formatDate(r.work_date),
      Company: r.company_name,
      Amount: r.amount_cost,
      "Days Overdue": r.days_overdue,
      Property: r.property_address,
      Contractor: r.contractor_name,
    }));

  return (
    <div className="container-fluid">
      <PageTitle title="Aging Reports" icon="📅" />
      <div className="card-section">
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <label className="form-label">Company</label>
            <select
              className="form-select"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setSupervisor(VIEW_ALL);
              }}
            >
              {companyNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Supervisor</label>
            <select
              className="form-select"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
            >
              {supervisors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
        </div>
        {loading ? (
          <div className="alert alert-info">Loading…</div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(r) => r.id}
              onRowDoubleClick={setDetailInvoice}
            />
            <InvoiceDetailModal
              invoice={detailInvoice}
              onClose={() => setDetailInvoice(null)}
            />
            <div className="mt-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() =>
                  void exportPdf(exportData(), "Aging_Reports", error, success)
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
                    "Aging_Reports.xlsx",
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
