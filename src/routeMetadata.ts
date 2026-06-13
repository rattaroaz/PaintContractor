export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export interface NavSection {
  header: string;
  items: NavItem[];
}

export interface SmokeRoute {
  path: string;
  titlePattern: RegExp;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    header: "Operations",
    items: [
      { to: "/startjob", label: "Start Job", icon: "📋" },
      { to: "/activejobs", label: "Active Jobs", icon: "🔧" },
      { to: "/createinvoice", label: "Create Invoice", icon: "🧾" },
    ],
  },
  {
    header: "Finance",
    items: [
      { to: "/accountsreceivable", label: "Accounts Receivable", icon: "🏦" },
      { to: "/agingreports", label: "Aging Reports", icon: "📅" },
      { to: "/sales", label: "Sales", icon: "📈" },
      { to: "/payroll", label: "Payroll", icon: "💰" },
      { to: "/contractorjobs", label: "Contractor Jobs", icon: "🏗" },
    ],
  },
  {
    header: "Reference Data",
    items: [
      { to: "/editviewcontacts", label: "Contacts", icon: "👥" },
      { to: "/newjobs", label: "Job Catalog", icon: "➕" },
    ],
  },
  {
    header: "System",
    items: [
      { to: "/importexport", label: "Import / Export / Backup", icon: "⇅" },
    ],
  },
  {
    header: "Settings",
    items: [{ to: "/settings/updates", label: "Updates", icon: "⚙" }],
  },
];

export const SMOKE_ROUTES: SmokeRoute[] = [
  { path: "/", titlePattern: /my company info/i },
  { path: "/startjob", titlePattern: /start (work order|a? ?job)/i },
  { path: "/activejobs", titlePattern: /active jobs/i },
  { path: "/createinvoice", titlePattern: /create invoice/i },
  { path: "/accountsreceivable", titlePattern: /accounts receivable/i },
  { path: "/agingreports", titlePattern: /aging/i },
  { path: "/sales", titlePattern: /sales/i },
  { path: "/payroll", titlePattern: /payroll/i },
  { path: "/contractorjobs", titlePattern: /contractor jobs/i },
  { path: "/editviewcontacts", titlePattern: /contacts/i },
  { path: "/newjobs", titlePattern: /new jobs|job catalog/i },
  { path: "/importexport", titlePattern: /import.*export/i },
  { path: "/settings/updates", titlePattern: /updates/i },
  { path: "/settings/updates/dashboard", titlePattern: /update dashboard/i },
  { path: "/profile", titlePattern: /profile/i },
  { path: "/addcontacts", titlePattern: /add (contacts|new)/i },
  { path: "/addcontacts/addcompany", titlePattern: /add.*company/i },
  { path: "/addcontacts/addsupervisor", titlePattern: /add (contacts|new)/i },
  { path: "/addcontacts/addproperty", titlePattern: /add (contacts|new)/i },
  { path: "/addcontacts/addcontractor", titlePattern: /add (contacts|new)/i },
  { path: "/addcontacts/addmanager", titlePattern: /add (contacts|new)/i },
  { path: "/logout", titlePattern: /my company info/i },
  { path: "/does-not-exist", titlePattern: /nothing at this address/i },
];
