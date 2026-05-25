import { clickNav, expectPageTitle, waitForApp } from "../helpers.js";

describe("Real runtime — Finance pages load data", () => {
  before(async () => {
    await waitForApp();
  });

  it("Accounts Receivable renders filter controls", async () => {
    await clickNav("Accounts Receivable");
    await expectPageTitle(/accounts receivable/i);
    await $("button=Done").waitForDisplayed({ timeout: 15_000 });
    await $("#ar-company-filter").waitForDisplayed({ timeout: 10_000 });
  });

  it("Sales page renders", async () => {
    await clickNav("Sales");
    await expectPageTitle(/sales/i);
  });

  it("Payroll page renders contractor section", async () => {
    await clickNav("Payroll");
    await expectPageTitle(/payroll/i);
  });

  it("Aging Reports page renders", async () => {
    await clickNav("Aging Reports");
    await expectPageTitle(/aging/i);
  });
});
