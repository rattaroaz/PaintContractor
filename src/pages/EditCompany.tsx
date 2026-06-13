import { useEffect, useState } from "react";
import { api } from "../api";
import { FormSelect } from "../components/FormSelect";
import { useNotification } from "../context/NotificationContext";
import type { Company, Property, Supervisor } from "../types";
import { emptyCompanyForm } from "../utils/company";
import { confirmDelete } from "../utils/confirm";

const emptySupervisor = (companyId: number): Supervisor => ({
  id: 0,
  name: "",
  phone: null,
  email: null,
  company_id: companyId,
  properties: [],
});

const emptyProperty = (supervisorId: number): Property => ({
  id: 0,
  name: "",
  address: null,
  city: null,
  zip: null,
  gate_code: null,
  garage_remote_code: null,
  lock_box: null,
  special_note: null,
  manager_name: null,
  manager_phone: null,
  manager_email: null,
  is_active: true,
  supervisor_id: supervisorId,
});

function serializeCompany(company: Company): string {
  return JSON.stringify(company);
}

export function EditCompany() {
  const { success, error } = useNotification();
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [baseline, setBaseline] = useState("");
  const [mode, setMode] = useState<"select" | "add">("select");
  const [expandedSup, setExpandedSup] = useState<Set<number>>(new Set());
  const [expandedProp, setExpandedProp] = useState<Set<string>>(new Set());

  useEffect(() => {
    void load();
    void emptyCompanyForm().then((empty) => {
      setCompany(empty);
      setBaseline(serializeCompany(empty));
    });
  }, []);

  const load = async () => {
    try {
      const list = await api.getAllCompanies();
      setAllCompanies(list);
    } catch (e) {
      error(String(e));
    }
  };

  const applyCompany = (next: Company) => {
    const copy = JSON.parse(JSON.stringify(next)) as Company;
    setCompany(copy);
    setBaseline(serializeCompany(copy));
  };

  const selectCompany = (name: string) => {
    const found = allCompanies.find((c) => c.name === name);
    if (found) {
      applyCompany(found);
      setMode("select");
    }
  };

  const startAddCompany = async () => {
    setMode("add");
    applyCompany(await emptyCompanyForm());
  };

  const updateField = <K extends keyof Company>(key: K, value: Company[K]) => {
    setCompany((c) => (c ? { ...c, [key]: value } : c));
  };

  const isDirty = company ? serializeCompany(company) !== baseline : false;

  const toggleSup = (idx: number) => {
    setExpandedSup((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleProp = (key: string) => {
    setExpandedProp((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!company || !isDirty) return;
    try {
      const result = await api.saveCompany(company);
      if (result.success) {
        success("Company saved.");
        await load();
        applyCompany(result.data ?? company);
      } else {
        error(result.message);
      }
    } catch (e) {
      error(String(e));
    }
  };

  const handleDelete = async () => {
    if (!company?.id) return;
    if (!(await confirmDelete())) return;
    try {
      const result = await api.deleteCompany(company.id);
      if (result.success) {
        success(result.message);
        const empty = await emptyCompanyForm();
        applyCompany(empty);
        await load();
      } else {
        error(result.message);
      }
    } catch (e) {
      error(String(e));
    }
  };

  const companyNames = allCompanies.map((c) => c.name);

  if (!company) {
    return <div className="alert alert-info">Loading…</div>;
  }

  return (
    <div>
      <div className="mb-3 d-flex gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "select" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setMode("select")}
        >
          Select Company
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "add" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => void startAddCompany()}
        >
          Add Company
        </button>
      </div>

      {mode === "select" && (
        <div className="mb-3">
          <label htmlFor="contacts-company-picker" className="form-label">
            Company
          </label>
          <FormSelect
            id="contacts-company-picker"
            options={companyNames}
            value={company.name}
            onChange={selectCompany}
            placeholder="Select…"
          />
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label">Company ID</label>
          <input
            type="number"
            className="form-control"
            value={company.company_id}
            onChange={(e) =>
              updateField("company_id", parseInt(e.target.value, 10) || 0)
            }
          />
        </div>
        <div className="col-md-5">
          <label className="form-label">Name *</label>
          <input
            className="form-control"
            value={company.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Owner</label>
          <input
            className="form-control"
            value={company.owner ?? ""}
            onChange={(e) => updateField("owner", e.target.value || null)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Phone</label>
          <input
            className="form-control"
            value={company.phone ?? ""}
            onChange={(e) => updateField("phone", e.target.value || null)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={company.email ?? ""}
            onChange={(e) => updateField("email", e.target.value || null)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">City</label>
          <input
            className="form-control"
            value={company.city ?? ""}
            onChange={(e) => updateField("city", e.target.value || null)}
          />
        </div>
        <div className="col-md-8">
          <label className="form-label">Address</label>
          <input
            className="form-control"
            value={company.address ?? ""}
            onChange={(e) => updateField("address", e.target.value || null)}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Zip</label>
          <input
            className="form-control"
            value={company.zip ?? ""}
            onChange={(e) => updateField("zip", e.target.value || null)}
          />
        </div>
        <div className="col-12">
          <label className="form-label">Special Note</label>
          <textarea
            className="form-control"
            rows={2}
            value={company.special_note ?? ""}
            onChange={(e) =>
              updateField("special_note", e.target.value || null)
            }
          />
        </div>
      </div>

      <hr />
      <h5>Supervisors</h5>
      {company.supervisors.map((sup, sIdx) => (
        <div key={sIdx} className="border rounded p-2 mb-2">
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => toggleSup(sIdx)}
          >
            {expandedSup.has(sIdx) ? "−" : "+"}{" "}
            <strong>{sup.name || "New Supervisor"}</strong>
          </button>
          {expandedSup.has(sIdx) && (
            <>
              <div className="row g-2 mt-2">
                <div className="col-md-4">
                  <input
                    className="form-control"
                    placeholder="Name"
                    value={sup.name}
                    onChange={(e) => {
                      const supervisors = [...company.supervisors];
                      supervisors[sIdx] = { ...sup, name: e.target.value };
                      updateField("supervisors", supervisors);
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className="form-control"
                    placeholder="Phone"
                    value={sup.phone ?? ""}
                    onChange={(e) => {
                      const supervisors = [...company.supervisors];
                      supervisors[sIdx] = {
                        ...sup,
                        phone: e.target.value || null,
                      };
                      updateField("supervisors", supervisors);
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className="form-control"
                    placeholder="Email"
                    value={sup.email ?? ""}
                    onChange={(e) => {
                      const supervisors = [...company.supervisors];
                      supervisors[sIdx] = {
                        ...sup,
                        email: e.target.value || null,
                      };
                      updateField("supervisors", supervisors);
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-danger mt-2"
                onClick={async () => {
                  if (!(await confirmDelete())) return;
                  if (sup.id) await api.deleteSupervisor(sup.id);
                  updateField(
                    "supervisors",
                    company.supervisors.filter((_, i) => i !== sIdx)
                  );
                }}
              >
                Delete Supervisor
              </button>
              {sup.properties.map((prop, pIdx) => {
                const pKey = `${sIdx}-${pIdx}`;
                return (
                  <div key={pKey} className="ms-3 mt-2 border-start ps-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-link"
                      onClick={() => toggleProp(pKey)}
                    >
                      {expandedProp.has(pKey) ? "−" : "+"}{" "}
                      {prop.name || "Property"}
                    </button>
                    <label className="ms-2">
                      <input
                        type="checkbox"
                        checked={prop.is_active !== false}
                        onChange={(e) => {
                          const supervisors = [...company.supervisors];
                          const properties = [...sup.properties];
                          properties[pIdx] = {
                            ...prop,
                            is_active: e.target.checked,
                          };
                          supervisors[sIdx] = { ...sup, properties };
                          updateField("supervisors", supervisors);
                        }}
                      />{" "}
                      Active
                    </label>
                    {expandedProp.has(pKey) && (
                      <div className="row g-2 mt-1">
                        {(
                          [
                            ["name", "Name"],
                            ["address", "Address"],
                            ["city", "City"],
                            ["zip", "Zip"],
                            ["manager_name", "Manager"],
                            ["gate_code", "Gate"],
                            ["garage_remote_code", "Garage"],
                            ["lock_box", "Lock Box"],
                            ["special_note", "Note"],
                          ] as const
                        ).map(([field, label]) => (
                          <div className="col-md-4" key={field}>
                            <input
                              className="form-control form-control-sm"
                              placeholder={label}
                              value={(prop[field] as string) ?? ""}
                              onChange={(e) => {
                                const supervisors = [...company.supervisors];
                                const properties = [...sup.properties];
                                properties[pIdx] = {
                                  ...prop,
                                  [field]: e.target.value || null,
                                };
                                supervisors[sIdx] = { ...sup, properties };
                                updateField("supervisors", supervisors);
                              }}
                            />
                          </div>
                        ))}
                        <div className="col-12">
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                              if (!(await confirmDelete())) return;
                              if (prop.id) await api.deleteProperty(prop.id);
                              const supervisors = [...company.supervisors];
                              supervisors[sIdx] = {
                                ...sup,
                                properties: sup.properties.filter(
                                  (_, i) => i !== pIdx
                                ),
                              };
                              updateField("supervisors", supervisors);
                            }}
                          >
                            Delete Property
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                className="btn btn-sm btn-outline-primary mt-2"
                onClick={() => {
                  const supervisors = [...company.supervisors];
                  supervisors[sIdx] = {
                    ...sup,
                    properties: [
                      ...sup.properties,
                      emptyProperty(sup.id || 0),
                    ],
                  };
                  updateField("supervisors", supervisors);
                }}
              >
                Add Property
              </button>
            </>
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline-primary btn-sm mb-3"
        onClick={() =>
          updateField("supervisors", [
            ...company.supervisors,
            emptySupervisor(company.id),
          ])
        }
      >
        Add Supervisor
      </button>

      <div className="row g-2 mt-3">
        {company.id > 0 && (
          <div className="col-md-6">
            <button
              type="button"
              className="btn btn-danger w-100"
              onClick={handleDelete}
            >
              Delete Company
            </button>
          </div>
        )}
        <div className="col-md-6">
          <button
            type="button"
            className="btn btn-success w-100"
            disabled={!isDirty}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
