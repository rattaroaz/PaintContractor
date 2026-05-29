import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DataTable, type DataColumn } from "../components/DataTable";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import { PageTitle } from "../components/PageTitle";
import { useGlobalState } from "../context/GlobalStateContext";
import { useNotification } from "../context/NotificationContext";
import type { Invoice } from "../types";
import { formatDate, formatInvoiceNumber } from "../utils/format";
import {
  buildAddresses,
  buildCompanyNames,
  filterByAddress,
  filterByCompany,
  filterByDateRange,
  invoiceToExportRow,
  VIEW_ALL,
} from "../utils/invoice";
import { exportExcel, exportPdf } from "../utils/exportActions";

export function SalesPage() {
  const { setCurrentSection } = useGlobalState();
  const { success, error } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [company, setCompany] = useState(VIEW_ALL);
  const [address, setAddress] = useState(VIEW_ALL);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setCurrentSection("Finance");
    load();
  }, [setCurrentSection]);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.getInvoicesSales();
      setInvoices(data);
      setHasLoaded(true);
    } catch (e) {
      setLoadError(String(e));
      error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const companies = useMemo(() => buildCompanyNames(invoices), [invoices]);

  const addresses = useMemo(() => {
    const subset =
      company === VIEW_ALL
        ? invoices
        : invoices.filter((i) => i.company_name === company);
    return buildAddresses(subset);
  }, [invoices, company]);

  const filtered = useMemo(() => {
    let list = filterByDateRange(
      invoices,
      startDate || undefined,
      endDate || undefined
    );
    list = filterByCompany(list, company);
    list = filterByAddress(list, address);
    return list;
  }, [invoices, startDate, endDate, company, address]);

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
    { key: "work_order", title: "Work Order", sortable: true },
    { key: "amount_cost", title: "Price", sortable: true },
    { key: "amount_paid1", title: "Paid 1", sortable: true },
    {
      key: "date_paid1",
      title: "Date Paid 1",
      render: (r) => (r.date_paid1 ? formatDate(r.date_paid1) : ""),
    },
    { key: "contractor_name", title: "Contractor", sortable: true },
  ];

  return (
    <div className="container-fluid">
      <PageTitle title="Sales" icon="📈" />
      <div className="card-section">
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <label htmlFor="sales-start-date" className="form-label">
              Start Date
            </label>
            <input
              id="sales-start-date"
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="sales-end-date" className="form-label">
              End Date
            </label>
            <input
              id="sales-end-date"
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="sales-company-filter" className="form-label">
              Company
            </label>
            <select
              id="sales-company-filter"
              className="form-select"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setAddress(VIEW_ALL);
              }}
              disabled={loading}
            >
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label htmlFor="sales-address-filter" className="form-label">
              Address
            </label>
            <select
              id="sales-address-filter"
              className="form-select"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            >
              {addresses.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="alert alert-info">Loading sales…</div>
        )}
        {loadError && <div className="alert alert-danger">{loadError}</div>}
        {hasLoaded && !loading && filtered.length === 0 && (
          <div className="alert alert-secondary">
            No sales invoices match the current filters.
          </div>
        )}

        {!loading && filtered.length > 0 && (
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
                onClick={() => {
                  const data = filtered.map((inv) =>
                    invoiceToExportRow(inv, formatInvoiceNumber, formatDate)
                  );
                  void exportPdf(data, "Sales", error, success);
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
                  void exportExcel(data, "Sales.xlsx", error, success);
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
