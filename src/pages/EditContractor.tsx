import { useEffect, useState } from "react";
import { api } from "../api";
import { FormSelect } from "../components/FormSelect";
import { useNotification } from "../context/NotificationContext";
import type { Contractor } from "../types";
import { confirmDelete } from "../utils/confirm";

const emptyContractor = (): Contractor => ({
  id: 0,
  name: "",
  license_number: null,
  social_security_number: null,
  contractor_id: null,
  payroll_percent: null,
  cell_phone: null,
  email: null,
  address: null,
  city: null,
  zip: null,
  special_note: null,
  is_active: true,
});

function serializeContractor(contractor: Contractor): string {
  return JSON.stringify(contractor);
}

export function EditContractor() {
  const { success, error } = useNotification();
  const [all, setAll] = useState<Contractor[]>([]);
  const [contractor, setContractor] = useState<Contractor>(emptyContractor());
  const [baseline, setBaseline] = useState(serializeContractor(emptyContractor()));
  const [mode, setMode] = useState<"select" | "add">("select");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setAll(await api.getAllContractors());
    } catch (e) {
      error(String(e));
    }
  };

  const applyContractor = (next: Contractor) => {
    const copy = { ...next };
    setContractor(copy);
    setBaseline(serializeContractor(copy));
  };

  const selectByName = (name: string) => {
    const found = all.find((c) => c.name === name);
    if (found) applyContractor(found);
  };

  const update = <K extends keyof Contractor>(k: K, v: Contractor[K]) => {
    setContractor((c) => ({ ...c, [k]: v }));
  };

  const isDirty = serializeContractor(contractor) !== baseline;

  const handleSave = async () => {
    if (!isDirty) return;
    if (!contractor.name.trim()) {
      error("Name is required.");
      return;
    }
    try {
      const result = await api.saveContractor(contractor);
      if (result.success) {
        success("Contractor saved.");
        await load();
        applyContractor(result.data ?? contractor);
      } else {
        error(result.message);
      }
    } catch (e) {
      error(String(e));
    }
  };

  const handleDelete = async () => {
    if (!contractor.id) return;
    if (!(await confirmDelete())) return;
    try {
      const result = await api.deleteContractor(contractor.id);
      if (result.success) {
        success(result.message);
        applyContractor(emptyContractor());
        await load();
      } else {
        error(result.message);
      }
    } catch (e) {
      error(String(e));
    }
  };

  return (
    <div>
      <div className="mb-3 d-flex gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "select" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setMode("select")}
        >
          Select Contractor
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "add" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            setMode("add");
            applyContractor(emptyContractor());
          }}
        >
          Add Contractor
        </button>
      </div>

      {mode === "select" && (
        <div className="mb-3">
          <label htmlFor="contacts-contractor-picker" className="form-label">
            Contractor
          </label>
          <FormSelect
            id="contacts-contractor-picker"
            options={all.map((c) => c.name)}
            value={contractor.name}
            onChange={selectByName}
            placeholder="Select…"
          />
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Name *</label>
          <input
            className="form-control"
            value={contractor.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">License Number</label>
          <input
            className="form-control"
            value={contractor.license_number ?? ""}
            onChange={(e) =>
              update("license_number", e.target.value || null)
            }
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">SSN</label>
          <input
            className="form-control"
            value={contractor.social_security_number ?? ""}
            onChange={(e) =>
              update("social_security_number", e.target.value || null)
            }
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Contractor ID</label>
          <input
            className="form-control"
            value={contractor.contractor_id ?? ""}
            onChange={(e) =>
              update("contractor_id", e.target.value || null)
            }
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Payroll %</label>
          <input
            className="form-control"
            value={contractor.payroll_percent ?? ""}
            onChange={(e) =>
              update("payroll_percent", e.target.value || null)
            }
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Cell Phone</label>
          <input
            className="form-control"
            value={contractor.cell_phone ?? ""}
            onChange={(e) => update("cell_phone", e.target.value || null)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={contractor.email ?? ""}
            onChange={(e) => update("email", e.target.value || null)}
          />
        </div>
        <div className="col-md-8">
          <label className="form-label">Address</label>
          <input
            className="form-control"
            value={contractor.address ?? ""}
            onChange={(e) => update("address", e.target.value || null)}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">City</label>
          <input
            className="form-control"
            value={contractor.city ?? ""}
            onChange={(e) => update("city", e.target.value || null)}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Zip</label>
          <input
            className="form-control"
            value={contractor.zip ?? ""}
            onChange={(e) => update("zip", e.target.value || null)}
          />
        </div>
        <div className="col-12">
          <label className="form-label">Special Note</label>
          <textarea
            className="form-control"
            rows={2}
            value={contractor.special_note ?? ""}
            onChange={(e) =>
              update("special_note", e.target.value || null)
            }
          />
        </div>
        <div className="col-12">
          <label>
            <input
              type="checkbox"
              checked={contractor.is_active !== false}
              onChange={(e) => update("is_active", e.target.checked)}
            />{" "}
            Active
          </label>
        </div>
      </div>

      <div className="row g-2 mt-3">
        {contractor.id > 0 && (
          <div className="col-md-6">
            <button
              type="button"
              className="btn btn-danger w-100"
              onClick={handleDelete}
            >
              Delete
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
