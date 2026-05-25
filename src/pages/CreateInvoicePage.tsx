import { useEffect, useState } from "react";
import { api } from "../api";
import { DataTable, type DataColumn } from "../components/DataTable";
import { CreateInvoiceConfirmModal } from "../components/modals/CreateInvoiceConfirmModal";
import { PageTitle } from "../components/PageTitle";
import { useGlobalState } from "../context/GlobalStateContext";
import { useNotification } from "../context/NotificationContext";
import type { Contractor, Invoice, JobDescription } from "../types";
import { formatDate, formatInvoiceNumber, todayIsoDate } from "../utils/format";
import { recalcInvoiceAmount } from "../utils/invoice";

export function CreateInvoicePage() {
  const { setCurrentSection } = useGlobalState();
  const { error } = useNotification();
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState(todayIsoDate());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setCurrentSection("Billing");
    (async () => {
      try {
        const [jobList, contractorList] = await Promise.all([
          api.getAllJobs(),
          api.getAllContractors(),
        ]);
        setJobs(jobList);
        setContractors(contractorList);
      } catch (e) {
        error(String(e));
      }
    })();
  }, [setCurrentSection, error]);

  const search = async () => {
    try {
      const data = await api.getInvoicesByDateRange(startDate, endDate);
      const recalced = data.map((inv) => recalcInvoiceAmount(inv, jobs));
      setInvoices(recalced);
      setHasSearched(true);
    } catch (e) {
      error(String(e));
    }
  };

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
    { key: "unit", title: "Unit", sortable: true },
    { key: "company_name", title: "Company", sortable: true },
    { key: "property_address", title: "Property", sortable: true },
    { key: "amount_cost", title: "Amount", sortable: true },
  ];

  return (
    <div className="container-fluid">
      <PageTitle title="Create Invoice" icon="🧾" />
      <div className="card-section">
        <div className="row g-3 mb-3 align-items-end">
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
          <div className="col-md-3">
            <button type="button" className="btn btn-primary" onClick={search}>
              Search
            </button>
          </div>
        </div>

        {hasSearched && invoices.length === 0 && (
          <div className="alert alert-info">
            No draft invoices found in the selected date range. Start a new job
            to create a draft invoice.
          </div>
        )}

        {invoices.length > 0 && (
          <DataTable
            columns={columns}
            data={invoices}
            rowKey={(r) => r.id}
            onRowClick={(row) => {
              setSelected(row);
              setShowModal(true);
            }}
          />
        )}
      </div>

      <CreateInvoiceConfirmModal
        show={showModal}
        invoice={selected}
        jobs={jobs}
        contractors={contractors}
        onClose={(saved) => {
          setShowModal(false);
          setSelected(null);
          if (saved) search();
        }}
      />
    </div>
  );
}
