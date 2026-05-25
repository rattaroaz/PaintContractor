import {
  clickNav,
  expectPageTitle,
  expectToast,
  openAddCompanyHub,
  uniqueCompanyId,
  waitForApp,
} from "../helpers.js";

describe("Real runtime — Add Company", () => {
  before(async () => {
    await waitForApp();
    await openAddCompanyHub();
  });

  it("persists a new company via real IPC", async () => {
    const id = uniqueCompanyId();
    const name = `WDIO Co ${id}`;

    const idInput = await $('input[type="number"]');
    await idInput.waitForDisplayed({ timeout: 10_000 });
    await idInput.setValue(String(id));

    const nameInput = await $('label=Name *').$('..').$('input');
    await nameInput.setValue(name);

    await $('button[type="submit"]').click();
    await expectToast(/company saved/i);

    await clickNav("Contacts");
    await expectPageTitle(/contacts/i);
    const browse = await $('button[title="Browse all"]');
    await browse.click();
    const item = await $(`//button[contains(@class,"list-group-item") and contains(., "${name}")]`);
    await item.waitForClickable({ timeout: 10_000 });
    await item.click();
    const nameField = await $('label=Name *').$('..').$('input');
    expect(await nameField.getValue()).toBe(name);
  });
});
