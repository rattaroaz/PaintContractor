import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useGlobalState } from "../context/GlobalStateContext";
import { useNotification } from "../context/NotificationContext";
import type { MyCompanyInfo } from "../types";

export function HomePage() {
  const { setCurrentSection, setMyCompanyInfo, refreshCompanyInfo } =
    useGlobalState();
  const { success, error } = useNotification();
  const [info, setInfo] = useState<MyCompanyInfo>({
    id: 0,
    name: "",
    phone: "",
    email: "",
    address: "",
    zip: "",
    license_number: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentSection("Dashboard");
    (async () => {
      try {
        const data = await api.getMyCompanyInfo();
        setInfo(data);
        setMyCompanyInfo(data);
      } catch (e) {
        error(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [setCurrentSection, setMyCompanyInfo, error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!info.name.trim()) {
      error("Name is required.");
      return;
    }
    try {
      const result = await api.saveMyCompanyInfo(info);
      if (result.success && result.data) {
        setInfo(result.data);
        setMyCompanyInfo(result.data);
        success(result.message || "Company profile saved.");
        await refreshCompanyInfo();
      } else {
        error(result.message || "Save failed.");
      }
    } catch (err) {
      error(String(err));
    }
  };

  if (loading) {
    return <div className="text-center py-5">Loading…</div>;
  }

  return (
    <div className="container-fluid">
      <PageTitle title="My Company Info" icon="🏠" />
      <div className="card-section col-lg-8 mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="home-name" className="form-label">Name *</label>
              <input
                id="home-name"
                className="form-control"
                value={info.name}
                onChange={(e) => setInfo({ ...info, name: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="home-phone" className="form-label">Phone *</label>
              <input
                id="home-phone"
                className="form-control"
                value={info.phone}
                onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="home-email" className="form-label">Email *</label>
              <input
                id="home-email"
                type="email"
                className="form-control"
                value={info.email}
                onChange={(e) => setInfo({ ...info, email: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="home-license" className="form-label">License Number *</label>
              <input
                id="home-license"
                className="form-control"
                value={info.license_number}
                onChange={(e) =>
                  setInfo({ ...info, license_number: e.target.value })
                }
                required
              />
            </div>
            <div className="col-12">
              <label htmlFor="home-address" className="form-label">Address *</label>
              <input
                id="home-address"
                className="form-control"
                value={info.address}
                onChange={(e) =>
                  setInfo({ ...info, address: e.target.value })
                }
                required
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="home-zip" className="form-label">Zip *</label>
              <input
                id="home-zip"
                className="form-control"
                value={info.zip}
                onChange={(e) => setInfo({ ...info, zip: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-4">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
