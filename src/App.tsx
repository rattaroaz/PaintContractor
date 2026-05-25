import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainLayout } from "./layout/MainLayout";
import { AccountsReceivablePage } from "./pages/AccountsReceivablePage";
import { ActiveJobsPage } from "./pages/ActiveJobsPage";
import { AddCompanyPage } from "./pages/AddCompanyPage";
import { AddContactsHubPage } from "./pages/AddContactsHubPage";
import { AgingReportsPage } from "./pages/AgingReportsPage";
import { ContractorJobsPage } from "./pages/ContractorJobsPage";
import { ContactsPage } from "./pages/ContactsPage";
import { CreateInvoicePage } from "./pages/CreateInvoicePage";
import { HomePage } from "./pages/HomePage";
import { ImportExportPage } from "./pages/ImportExportPage";
import { JobCatalogPage } from "./pages/JobCatalogPage";
import { LogoutPage } from "./pages/LogoutPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PayrollPage } from "./pages/PayrollPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SalesPage } from "./pages/SalesPage";
import { StartJobPage } from "./pages/StartJobPage";
import { UpdateDashboardPage } from "./pages/UpdateDashboardPage";
import { UpdateSettingsPage } from "./pages/UpdateSettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/logout" element={<LogoutPage />} />
      <Route
        element={
          <ErrorBoundary>
            <MainLayout />
          </ErrorBoundary>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="startjob" element={<StartJobPage />} />
        <Route path="activejobs" element={<ActiveJobsPage />} />
        <Route path="createinvoice" element={<CreateInvoicePage />} />
        <Route path="accountsreceivable" element={<AccountsReceivablePage />} />
        <Route path="agingreports" element={<AgingReportsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="contractorjobs" element={<ContractorJobsPage />} />
        <Route path="editviewcontacts" element={<ContactsPage />} />
        <Route path="newjobs" element={<JobCatalogPage />} />
        <Route path="importexport" element={<ImportExportPage />} />
        <Route path="settings/updates" element={<UpdateSettingsPage />} />
        <Route
          path="settings/updates/dashboard"
          element={<UpdateDashboardPage />}
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="addcontacts" element={<AddContactsHubPage />} />
        <Route path="addcontacts/addcompany" element={<AddCompanyPage />} />
        <Route
          path="addcontacts/addsupervisor"
          element={<Navigate to="/addcontacts" replace />}
        />
        <Route
          path="addcontacts/addproperty"
          element={<Navigate to="/addcontacts" replace />}
        />
        <Route
          path="addcontacts/addcontractor"
          element={<Navigate to="/addcontacts" replace />}
        />
        <Route
          path="addcontacts/addmanager"
          element={<Navigate to="/addcontacts" replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
