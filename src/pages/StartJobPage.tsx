import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { FormSelect } from "../components/FormSelect";
import { StartJobConfirmModal } from "../components/modals/StartJobConfirmModal";
import { Modal } from "../components/Modal";
import { PageTitle } from "../components/PageTitle";
import { useGlobalState } from "../context/GlobalStateContext";
import { useNotification } from "../context/NotificationContext";
import type { Invoice, JobDescription, PropertyAddressEntry } from "../types";
import { todayIsoDate } from "../utils/format";
import { confirmDelete } from "../utils/confirm";
import { uniqueJobDescriptions } from "../utils/jobs";
import {
  buildJobDescriptionChoice,
  calcAmountFromJobs,
  InvoiceStatus,
} from "../utils/invoice";

export function StartJobPage() {
  const navigate = useNavigate();
  const { setCurrentSection } = useGlobalState();
  const { success, error } = useNotification();

  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [propertyMap, setPropertyMap] = useState<
    Record<string, PropertyAddressEntry[1]>
  >({});

  const [todaysDate, setTodaysDate] = useState(todayIsoDate());
  const [workDate, setWorkDate] = useState(todayIsoDate());
  const [companyName, setCompanyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [sizeBedroom, setSizeBedroom] = useState(0);
  const [sizeBathroom, setSizeBathroom] = useState(0);
  const [gateCode, setGateCode] = useState("");
  const [lockBox, setLockBox] = useState("");
  const [garageRemote, setGarageRemote] = useState("");
  const [workOrder, setWorkOrder] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [jobRows, setJobRows] = useState<string[]>([""]);

  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [pendingCompany, setPendingCompany] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setCurrentSection("Operations");
    loadData();
  }, [setCurrentSection]);

  const loadData = async () => {
    try {
      const [jobList, companies] = await Promise.all([
        api.getAllJobs(),
        api.getAllCompanies(),
      ]);
      setJobs(jobList);
      setCompanyNames(companies.map((c) => c.name).sort());
    } catch (e) {
      error(String(e));
    }
  };

  const loadProperties = async (name: string) => {
    if (!name) {
      setAddresses([]);
      setPropertyMap({});
      return;
    }
    try {
      const entries = await api.getCompanyPropertyAddresses(name);
      const addrs = entries.map(([addr]) => addr);
      const map: Record<string, PropertyAddressEntry[1]> = {};
      entries.forEach(([addr, prop]) => {
        map[addr] = prop;
      });
      setAddresses(addrs);
      setPropertyMap(map);
    } catch {
      setAddresses([]);
      setPropertyMap({});
    }
  };

  const handleCompanyChange = async (name: string) => {
    setCompanyName(name);
    setPropertyAddress("");
    setGateCode("");
    setLockBox("");
    setGarageRemote("");
    const exists = companyNames.some(
      (c) => c.toLowerCase() === name.trim().toLowerCase()
    );
    if (name.trim() && !exists) {
      setPendingCompany(name.trim());
      setShowCompanyDialog(true);
    } else {
      await loadProperties(name);
    }
  };

  const handleAddCompany = async () => {
    try {
      const result = await api.ensureCompanyByName(pendingCompany);
      if (result.success && result.data) {
        success(`'${pendingCompany}' has been saved to the database.`);
        setCompanyNames((prev) =>
          [...prev, result.data!.name].sort()
        );
        setCompanyName(result.data.name);
        await loadProperties(result.data.name);
      } else {
        error(result.message);
      }
    } catch (e) {
      error(String(e));
    }
    setShowCompanyDialog(false);
  };

  const handlePropertyChange = (addr: string) => {
    setPropertyAddress(addr);
    const prop = propertyMap[addr];
    if (prop) {
      setGateCode(prop.gate_code ?? "");
      setLockBox(prop.lock_box ?? "");
      setGarageRemote(prop.garage_remote_code ?? "");
      if (prop.special_note) setSpecialNote(prop.special_note);
    } else {
      setGateCode("");
      setLockBox("");
      setGarageRemote("");
    }
  };

  const buildDraft = (): Invoice | null => {
    if (!companyName.trim() || !propertyAddress.trim() || !unit.trim()) {
      error("Company, property address, and unit are required.");
      return null;
    }
    if (!workDate || !todaysDate) {
      error("Dates are required.");
      return null;
    }
    const choice = buildJobDescriptionChoice(jobRows);
    const amount = calcAmountFromJobs(
      choice,
      jobs,
      sizeBedroom,
      sizeBathroom
    );
    return {
      id: 0,
      todays_date: todaysDate,
      work_date: workDate,
      company_name: companyName,
      property_address: propertyAddress,
      unit,
      gate_code: gateCode || null,
      lock_box: lockBox || null,
      size_bedroom: sizeBedroom,
      size_bathroom: sizeBathroom,
      work_order: workOrder || null,
      job_description_choice: choice,
      contractor_name: "N/A",
      amount_cost: amount,
      amount_paid1: 0,
      amount_paid2: 0,
      special_note: specialNote || null,
      garage_remote_code: garageRemote || null,
      status: InvoiceStatus.Draft,
    };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const draft = buildDraft();
    if (!draft) return;
    setDraftInvoice(draft);
    setShowConfirm(true);
  };

  const jobOptions = uniqueJobDescriptions(jobs);

  return (
    <div className="container-fluid">
      <PageTitle title="Start Work Order" icon="📋" />
      <div className="card-section">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Today's Date *</label>
              <input
                type="date"
                className="form-control"
                value={todaysDate}
                onChange={(e) => setTodaysDate(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Work Date *</label>
              <input
                type="date"
                className="form-control"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="startjob-company" className="form-label">
                Company Name *
              </label>
              <FormSelect
                id="startjob-company"
                options={companyNames}
                value={companyName}
                onChange={handleCompanyChange}
                placeholder="Select…"
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="startjob-property" className="form-label">
                Property Address *
              </label>
              <FormSelect
                id="startjob-property"
                options={addresses}
                value={propertyAddress}
                onChange={handlePropertyChange}
                placeholder="Select…"
                disabled={!companyName}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Unit # *</label>
              <input
                className="form-control"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Bedrooms</label>
              <input
                type="number"
                min={0}
                max={20}
                className="form-control"
                value={sizeBedroom}
                onChange={(e) =>
                  setSizeBedroom(parseInt(e.target.value, 10) || 0)
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
                value={sizeBathroom}
                onChange={(e) =>
                  setSizeBathroom(parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Work Order</label>
              <input
                className="form-control"
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Gate Code</label>
              <input
                className="form-control"
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Lock Box</label>
              <input
                className="form-control"
                value={lockBox}
                onChange={(e) => setLockBox(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Garage Remote Code</label>
              <input
                className="form-control"
                value={garageRemote}
                onChange={(e) => setGarageRemote(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Special Note</label>
              <textarea
                className="form-control"
                rows={2}
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Job Description</label>
              {jobRows.map((row, idx) => (
                <div key={idx} className="input-group mb-2">
                  <FormSelect
                    options={jobOptions}
                    value={row}
                    onChange={(v) => {
                      const next = [...jobRows];
                      next[idx] = v;
                      setJobRows(next);
                    }}
                    placeholder="Select…"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => {
                      void (async () => {
                        if (!(await confirmDelete())) return;
                        setJobRows(jobRows.filter((_, i) => i !== idx));
                      })();
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => setJobRows([...jobRows, ""])}
              >
                Add Another Option
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-4">
            Submit
          </button>
        </form>
      </div>

      <Modal
        show={showCompanyDialog}
        title="Company Not Found"
        onClose={() => setShowCompanyDialog(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCompanyDialog(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddCompany}
            >
              Add Company
            </button>
          </>
        }
      >
        <p>
          &apos;{pendingCompany}&apos; was not found. Would you like to add it
          as a new company?
        </p>
      </Modal>

      <StartJobConfirmModal
        show={showConfirm}
        invoice={draftInvoice}
        onClose={(saved) => {
          setShowConfirm(false);
          if (saved) navigate("/createinvoice");
        }}
      />
    </div>
  );
}
