import { useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { EditCompany } from "./EditCompany";
import { EditContractor } from "./EditContractor";

export function ContactsPage() {
  const [tab, setTab] = useState<"company" | "contractor">("company");

  return (
    <div className="container-fluid">
      <PageTitle title="Contacts" icon="👥" />
      <div className="card-section">
        <div className="btn-group mb-4" role="group">
          <button
            type="button"
            className={`btn ${tab === "company" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setTab("company")}
          >
            Company
          </button>
          <button
            type="button"
            className={`btn ${tab === "contractor" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setTab("contractor")}
          >
            Contractor
          </button>
        </div>
        {tab === "company" ? <EditCompany /> : <EditContractor />}
      </div>
    </div>
  );
}
