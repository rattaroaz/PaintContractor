import {
  clickNav,
  expectPageTitle,
  expectToast,
  waitForApp,
} from "../helpers.js";

describe("Real runtime — Job Catalog debounced save", () => {
  before(async () => {
    await waitForApp();
    await clickNav("Job Catalog");
    await expectPageTitle(/new jobs/i);
  });

  it("auto-saves a new job description after debounce", async () => {
    const desc = `WDIO Job ${Date.now()}`;
    const inputs = await $$(".card-section input.form-control");
    const descInput = inputs[0];
    await descInput.waitForDisplayed({ timeout: 10_000 });
    await descInput.setValue(desc);

    const saved = await $('//span[contains(@class,"text-success") and contains(., "Saved")]');
    await saved.waitForDisplayed({ timeout: 8_000 });

    await $("button=Refresh").click();
    await browser.pause(800);
    expect(await inputs[0].getValue()).toBe(desc);
  });

  it("rejects duplicate descriptions", async () => {
    const desc = `WDIO Dup ${Date.now()}`;
    const inputs = await $$(".card-section input.form-control");
    await inputs[0].setValue(desc);
    await $('//span[contains(@class,"text-success") and contains(., "Saved")]').waitForDisplayed({
      timeout: 8_000,
    });

    const addBtn = await $("button=Add");
    await addBtn.click();
    const allInputs = await $$(".card-section input.form-control");
    const last = allInputs[allInputs.length - 1];
    await last.setValue(desc);
    await browser.waitUntil(
      async () => {
        const text = (await $("body").getText()).toLowerCase();
        return text.includes("already exists") || text.includes("duplicate");
      },
      { timeout: 8_000, timeoutMsg: "duplicate description error not shown" }
    );
  });
});
