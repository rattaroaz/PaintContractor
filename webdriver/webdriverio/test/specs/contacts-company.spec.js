import {
  clickNav,
  expectPageTitle,
  openAddCompanyHub,
  uniqueCompanyId,
  waitForApp,
} from "../helpers.js";

describe("Real runtime — Contacts company browse", () => {
  const id = uniqueCompanyId();
  const name = `WDIO Browse ${id}`;

  before(async () => {
    await waitForApp();
    await openAddCompanyHub();
    const idInput = await $('input[type="number"]');
    await idInput.setValue(String(id));
    const nameInput = await $('label=Name *').$('..').$('input');
    await nameInput.setValue(name);
    await $('button[type="submit"]').click();
    await $("span.text-success, [role=alert] .toast-body").waitForDisplayed({
      timeout: 12_000,
    });
  });

  it("lists saved company in Contacts dropdown", async () => {
    await clickNav("Contacts");
    await expectPageTitle(/contacts/i);

    const browse = await $('button[title="Browse all"]');
    await browse.waitForClickable({ timeout: 10_000 });
    await browse.click();

    const item = await $(`button.list-group-item*=${name}`);
    await item.waitForClickable({ timeout: 8_000 });
    await item.click();

    const nameField = await $('label=Name *').$('..').$('input');
    await nameField.waitForDisplayed({ timeout: 8_000 });
    expect(await nameField.getValue()).toBe(name);

    const deleteBtn = await $("button*=Delete Company");
    await deleteBtn.waitForDisplayed({ timeout: 8_000 });
  });
});
