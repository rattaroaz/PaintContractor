import { useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { AddCompanyPage } from "./AddCompanyPage";
import { EditContractor } from "./EditContractor";

type HubOption = "company" | "contractor";

export function AddContactsHubPage() {
  const [selected, setSelected] = useState<HubOption>("company");

  return (
    <div className="container-fluid">
      <PageTitle title="Add Contacts" icon="➕" />
      <div className="card-section">
        <div className="btn-group mb-4 flex-wrap" role="group">
          {(
            [
              ["company", "Company"],
              ["contractor", "Contractor"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`btn ${
                selected === val ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setSelected(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {selected === "company" ? <AddCompanyPage embedded /> : <EditContractor />}
      </div>
    </div>
  );
}
