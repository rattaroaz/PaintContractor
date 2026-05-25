import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useGlobalState } from "../context/GlobalStateContext";
import { useNotification } from "../context/NotificationContext";
import type { Invoice } from "../types";
import { formatDate, formatInvoiceNumber } from "../utils/format";
import {
  buildCompanyNames,
  filterByCompany,
  invoiceToExportRow,
  VIEW_ALL,
} from "../utils/invoice";
import { exportExcel, exportPdf } from "../utils/exportActions";

const COLUMN_ORDER_KEY = "AccountReceivableColumnOrder";

type ArColumn = {
  key: string;
  title: string;
  render: (inv: Invoice, selected: boolean, onChange: (inv: Invoice) => void) => React.ReactNode;
};

const defaultColumns: ArColumn[] = [
  {
    key: "select",
    title: "Select",
    render: (inv, selected, onChange) => (
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => {
          if (e.target.checked) onChange(inv);
        }}
      />
    ),
  },
  {
    key: "invoice",
    title: "Invoice Number",
    render: (inv) => formatInvoiceNumber(inv.id),
  },
  {
    key: "work_date",
    title: "Work Date",
    render: (inv) => formatDate(inv.work_date),
  },
  { key: "company_name", title: "Company Name", render: (inv) => inv.company_name },
  { key: "amount_cost", title: "Amount Cost", render: (inv) => inv.amount_cost },
  {
    key: "payment1",
    title: "1st Payment",
    render: (inv, selected, onChange) =>
      selected ? (
        <div className="d-flex flex-column gap-1">
          <input
            type="number"
            className="form-control form-control-sm"
            value={inv.amount_paid1}
            onChange={(e) =>
              onChange({
                ...inv,
                amount_paid1: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <input
            type="date"
            className="form-control form-control-sm"
            value={inv.date_paid1 ?? ""}
            onChange={(e) =>
              onChange({ ...inv, date_paid1: e.target.value || null })
            }
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Check #"
            value={inv.check_number1 ?? ""}
            onChange={(e) =>
              onChange({ ...inv, check_number1: e.target.value || null })
            }
          />
        </div>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "payment2",
    title: "2nd Payment",
    render: (inv, selected, onChange) =>
      selected ? (
        <div className="d-flex flex-column gap-1">
          <input
            type="number"
            className="form-control form-control-sm"
            value={inv.amount_paid2}
            onChange={(e) =>
              onChange({
                ...inv,
                amount_paid2: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <input
            type="date"
            className="form-control form-control-sm"
            value={inv.date_paid2 ?? ""}
            onChange={(e) =>
              onChange({ ...inv, date_paid2: e.target.value || null })
            }
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Check #"
            value={inv.check_number2 ?? ""}
            onChange={(e) =>
              onChange({ ...inv, check_number2: e.target.value || null })
            }
          />
        </div>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  { key: "special_note", title: "Special Note", render: (inv) => inv.special_note ?? "" },
  { key: "property_address", title: "Property Address", render: (inv) => inv.property_address },
  { key: "unit", title: "Unit", render: (inv) => inv.unit },
];

export function AccountsReceivablePage() {
  const { setCurrentSection } = useGlobalState();
  const { success, error } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [edited, setEdited] = useState<Record<number, Invoice>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [company, setCompany] = useState(VIEW_ALL);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[]>(
    defaultColumns.map((c) => c.title)
  );

  useEffect(() => {
    setCurrentSection("Finance");
    const saved = localStorage.getItem(COLUMN_ORDER_KEY);
    if (saved) {
      setColumnOrder(saved.split(",").filter(Boolean));
    }
    load();
  }, [setCurrentSection]);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.getInvoicesReceivable();
      setInvoices(data);
      setEdited({});
      setSelectedIds(new Set());
      setHasLoaded(true);
    } catch (e) {
      setLoadError(String(e));
      error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const companies = useMemo(() => buildCompanyNames(invoices), [invoices]);

  const filtered = useMemo(
    () => filterByCompany(invoices, company),
    [invoices, company]
  );

  const orderedColumns = useMemo(() => {
    const map = new Map(defaultColumns.map((c) => [c.title, c]));
    const ordered: ArColumn[] = [];
    for (const title of columnOrder) {
      const col = map.get(title);
      if (col) ordered.push(col);
    }
    for (const col of defaultColumns) {
      if (!ordered.includes(col)) ordered.push(col);
    }
    return ordered;
  }, [columnOrder]);

  const getRow = useCallback(
    (inv: Invoice) => edited[inv.id] ?? inv,
    [edited]
  );

  const updateRow = (inv: Invoice) => {
    setEdited((prev) => ({ ...prev, [inv.id]: inv }));
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDone = async () => {
    const selected = filtered
      .filter((i) => selectedIds.has(i.id))
      .map((i) => getRow(i));
    if (!selected.length) {
      error("Select at least one invoice.");
      return;
    }
    try {
      const result = await api.applyReceivablePayments(selected);
      if (result.success) {
        success(result.message);
        await load();
      } else {
        error(result.message);
      }
    } catch (e) {
      error(String(e));
    }
  };

  const exportRows = () =>
    filtered.map((inv) => {
      const r = getRow(inv);
      return invoiceToExportRow(r, formatInvoiceNumber, formatDate);
    });

  return (
    <div className="container-fluid">
      <PageTitle title="Accounts Receivable" icon="🏦" />
      <div className="card-section">
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Company</label>
            <select
              className="form-select"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={loading}
            >
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="alert alert-info">Loading accounts receivable…</div>
        )}
        {loadError && (
          <div className="alert alert-danger">{loadError}</div>
        )}
        {hasLoaded && !loading && filtered.length === 0 && (
          <div className="alert alert-secondary">
            No receivable invoices match the current filters.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  {orderedColumns.map((col) => (
                    <th key={col.key}>{col.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 1000).map((inv) => {
                  const row = getRow(inv);
                  const sel = selectedIds.has(inv.id);
                  return (
                    <tr key={inv.id}>
                      {orderedColumns.map((col) => (
                        <td key={col.key}>
                          {col.key === "select" ? (
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={(e) =>
                                toggleSelect(inv.id, e.target.checked)
                              }
                            />
                          ) : (
                            col.render(row, sel, updateRow)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-success"
            disabled={loading}
            onClick={handleDone}
          >
            Done
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={loading}
            onClick={() =>
              void exportPdf(exportRows(), "Accounts_Receivable", error, success)
            }
          >
            Download PDF
          </button>
          <button
            type="button"
            className="btn btn-outline-success"
            disabled={loading}
            onClick={() =>
              void exportExcel(
                exportRows(),
                "Accounts_Receivable.xlsx",
                error,
                success
              )
            }
          >
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
}
