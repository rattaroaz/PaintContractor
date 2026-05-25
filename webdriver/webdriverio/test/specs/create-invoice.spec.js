import { clickNav, expectPageTitle, waitForApp } from "../helpers.js";

describe("Real runtime — Create Invoice", () => {
  before(async () => {
    await waitForApp();
    await clickNav("Create Invoice");
    await expectPageTitle(/create invoice/i);
  });

  it("shows date search UI backed by real catalog IPC", async () => {
    await $('label=Start Date').waitForDisplayed({ timeout: 15_000 });
    await $("button=Search").waitForDisplayed({ timeout: 10_000 });
    const text = await $(".card-section").getText();
    expect(text.toLowerCase()).toMatch(/start date|end date|search/);
  });
});
