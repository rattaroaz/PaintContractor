import {
  clickNav,
  expectPageTitle,
  expectToast,
  openAddCompanyHub,
  uniqueCompanyId,
  waitForApp,
} from "../../helpers.js";

describe("Real runtime — destructive delete (auto-confirm build)", () => {
  const id = uniqueCompanyId();
  const name = `WDIO Delete ${id}`;

  before(async () => {
    await waitForApp();
    await openAddCompanyHub();
    const idInput = await $('input[type="number"]');
    await idInput.setValue(String(id));
    const nameInput = await $('label=Name *').$('..').$('input');
    await nameInput.setValue(name);
    await $('button[type="submit"]').click();
    await expectToast(/company saved/i);
    await browser.pause(4500);
  });

  it("deletes company through real confirm + SQLite", async () => {
    await clickNav("Contacts");
    await expectPageTitle(/contacts/i);

    const browse = await $('button[title="Browse all"]');
    await browse.click();
    const item = await $(`button.list-group-item*=${name}`);
    await item.click();

    await browser.pause(800);
    const deleteBtn = await $(
      '//button[contains(@class,"btn-danger") and normalize-space()="Delete Company"]'
    );
    await deleteBtn.waitForDisplayed({ timeout: 10_000 });
    await deleteBtn.click();
    await expectToast(/company deleted/i);

    if (await browse.isExisting()) {
      await browse.click();
      const gone = await $(
        `//button[contains(@class,"list-group-item") and contains(., "${name}")]`
      );
      expect(await gone.isExisting()).toBe(false);
    } else {
      expect(await deleteBtn.isExisting()).toBe(false);
    }
  });
});
