import { useState } from "react";
import { Link } from "react-router-dom";
import { PageTitle } from "../components/PageTitle";
import { AddCompanyPage } from "./AddCompanyPage";
import { EditContractor } from "./EditContractor";

type HubOption = "1" | "2" | "3" | "4" | "5";

export function AddContactsHubPage() {
  const [selected, setSelected] = useState<HubOption>("1");

  return (
    <div className="container-fluid">
      <PageTitle title="Add Contacts" icon="➕" />
      <div className="card-section">
        <div className="btn-group mb-4 flex-wrap" role="group">
          {(
            [
              ["1", "Company"],
              ["2", "Property"],
              ["3", "Supervisor"],
              ["4", "Manager"],
              ["5", "Contractor"],
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

        {selected === "1" && <AddCompanyPage embedded />}
        {selected === "5" && <EditContractor />}
        {(selected === "2" || selected === "3" || selected === "4") && (
          <div className="alert alert-info">
            Use{" "}
            <Link to="/editviewcontacts">Contacts</Link> to add{" "}
            {selected === "2"
              ? "properties"
              : selected === "3"
                ? "supervisors"
                : "managers"}{" "}
            under an existing company, or open the dedicated route:{" "}
            <Link to={`/addcontacts/add${selected === "2" ? "property" : selected === "3" ? "supervisor" : "manager"}`}>
              /addcontacts/add
              {selected === "2"
                ? "property"
                : selected === "3"
                  ? "supervisor"
                  : "manager"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
