import {
  clickNav,
  expectPageTitle,
  goto,
  waitForApp,
} from "../helpers.js";

describe("Real runtime — navigation smoke", () => {
  before(async () => {
    await waitForApp();
  });

  const routes = [
    { nav: null, path: "/", title: /my company info/i },
    { nav: "Start Job", path: null, title: /start/i },
    { nav: "Active Jobs", path: null, title: /active jobs/i },
    { nav: "Create Invoice", path: null, title: /create invoice/i },
    { nav: "Accounts Receivable", path: null, title: /accounts receivable/i },
    { nav: "Aging Reports", path: null, title: /aging/i },
    { nav: "Sales", path: null, title: /sales/i },
    { nav: "Payroll", path: null, title: /payroll/i },
    { nav: "Contractor Jobs", path: null, title: /contractor jobs/i },
    { nav: "Contacts", path: null, title: /contacts/i },
    { nav: "Job Catalog", path: null, title: /new jobs/i },
    { nav: "Import / Export", path: null, title: /import/i },
    // Skip Update Settings in smoke — default repo triggers GitHub 404 noise in toasts.
    { nav: null, path: "/addcontacts", title: /add contacts/i },
  ];

  for (const { nav, path, title } of routes) {
    it(`mounts ${nav ?? path}`, async () => {
      if (path) {
        await goto(path);
      } else if (nav) {
        await clickNav(nav);
      }
      await expectPageTitle(title);
      const fatal = await $(".alert-danger");
      expect(await fatal.isDisplayed().catch(() => false)).toBe(false);
    });
  }
});
