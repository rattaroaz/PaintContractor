import { PageTitle } from "../components/PageTitle";

export function ProfilePage() {
  return (
    <div className="container-fluid">
      <PageTitle title="Profile" icon="👤" />
      <div className="card-section col-lg-8 mx-auto">
        <p>
          Profile management is no longer available since authentication has
          been removed from the application.
        </p>
        <p className="mb-0">
          All users now have full access to all features without needing to log
          in.
        </p>
      </div>
    </div>
  );
}
