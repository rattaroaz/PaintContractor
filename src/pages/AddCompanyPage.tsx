import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useNotification } from "../context/NotificationContext";
import type { Company } from "../types";
import { emptyCompanyForm } from "../utils/company";

export function AddCompanyPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [form, setForm] = useState<Company | null>(null);

  useEffect(() => {
    void emptyCompanyForm().then(setForm);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) {
      error("Name is required.");
      return;
    }
    if (form.company_id < 1000 || form.company_id > 9999) {
      error("Company ID must be between 1000 and 9999.");
      return;
    }
    try {
      const result = await api.saveCompany(form);
      if (result.success) {
        success("Company saved.");
        setForm(await emptyCompanyForm());
      } else {
        error(result.message);
      }
    } catch (err) {
      error(String(err));
    }
  };

  if (!form) {
    return (
      <div className={embedded ? "" : "container-fluid"}>
        <div className="alert alert-info">Loading…</div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "container-fluid"}>
      {!embedded && <PageTitle title="Add Company" icon="🏢" />}
      <div className={embedded ? "" : "card-section col-lg-8 mx-auto"}>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Company ID * (1000–9999)</label>
              <input
                type="number"
                min={1000}
                max={9999}
                className="form-control"
                value={form.company_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    company_id: parseInt(e.target.value, 10) || 1000,
                  })
                }
                required
              />
            </div>
            <div className="col-md-8">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Owner</label>
              <input
                type="text"
                className="form-control"
                value={form.owner ?? ""}
                onChange={(e) =>
                  setForm({ ...form, owner: e.target.value || null })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-control"
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value || null })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value || null })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-control"
                value={form.city ?? ""}
                onChange={(e) =>
                  setForm({ ...form, city: e.target.value || null })
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-control"
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value || null })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Zip</label>
              <input
                type="text"
                className="form-control"
                value={form.zip ?? ""}
                onChange={(e) =>
                  setForm({ ...form, zip: e.target.value || null })
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label">Special Note</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.special_note ?? ""}
                onChange={(e) =>
                  setForm({ ...form, special_note: e.target.value || null })
                }
              />
            </div>
          </div>
          <div className="row g-2 mt-4">
            <div className="col-md-6">
              <button
                type="button"
                className="btn btn-danger w-100"
                onClick={() => navigate("/")}
              >
                Cancel
              </button>
            </div>
            <div className="col-md-6">
              <button type="submit" className="btn btn-success w-100">
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
