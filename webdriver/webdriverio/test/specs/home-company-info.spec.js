import {
  expectPageTitle,
  expectToast,
  goHome,
  waitForApp,
} from "../helpers.js";

describe("Real runtime — My Company Info", () => {
  before(async () => {
    await waitForApp();
    await goHome();
    await expectPageTitle(/my company info/i);
  });

  it("saves company profile to SQLite", async () => {
    const suffix = Date.now().toString(36);
    const name = `WDIO Paint Co ${suffix}`;

    await $("#home-name").waitForDisplayed({ timeout: 10_000 });
    await $("#home-name").setValue(name);
    await $("#home-phone").setValue("555-0100");
    await $("#home-email").setValue(`wdio-${suffix}@example.com`);
    await $("#home-license").setValue("LIC-WDIO");
    await $("#home-address").setValue("100 Test Lane");
    await $("#home-zip").setValue("90210");

    await $('//button[@type="submit" and contains(., "Save")]').click();
    await expectToast(/saved|company profile/i);

    await browser.refresh();
    await waitForApp();
    await goHome();
    await $("#home-name").waitForDisplayed({ timeout: 15_000 });
    const persisted = await $("#home-name").getValue();
    expect(persisted).toBe(name);
  });
});
