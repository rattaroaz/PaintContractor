/** @typedef {import('webdriverio').Browser} Browser */

/**
 * Wait for the React shell (sidebar + main content).
 */
export async function waitForApp() {
  await $(".sidebar-nav").waitForDisplayed({ timeout: 45_000 });
  await $(".main-content").waitForDisplayed({ timeout: 10_000 });
  await browser.execute(() => {
    localStorage.setItem(
      "UpdateSettings",
      JSON.stringify({
        repository_owner: "rattaroaz",
        repository_name: "DKSKMaui",
        check_on_startup: false,
        enabled: false,
      })
    );
  });
}

/**
 * Click a sidebar nav link by visible label (emoji prefix is ignored).
 * @param {string} label e.g. "Contacts", "Job Catalog"
 */
export async function clickNav(label) {
  const link = await $(`//aside//a[contains(normalize-space(.), "${label}")]`);
  await link.waitForClickable({ timeout: 15_000 });
  await link.click();
  await browser.pause(350);
}

/**
 * @param {string|RegExp} text
 */
export async function expectPageTitle(text) {
  const title = await $("h3.page-title");
  await title.waitForDisplayed({ timeout: 15_000 });
  const value = await title.getText();
  if (text instanceof RegExp) {
    expect(value).toMatch(text);
  } else {
    expect(value.toLowerCase()).toContain(text.toLowerCase());
  }
}

/**
 * @param {string|RegExp} message
 */
export async function expectToast(message, kind = "success") {
  const bg =
    kind === "error" ? "bg-danger" : kind === "info" ? "bg-info" : "bg-success";
  await browser.waitUntil(
    async () => {
      const bodies = await $$(`.toast.${bg} .toast-body`);
      for (const body of bodies) {
        const text = await body.getText();
        if (message instanceof RegExp) {
          if (message.test(text)) return true;
        } else if (text.toLowerCase().includes(message.toLowerCase())) {
          return true;
        }
      }
      return false;
    },
    {
      timeout: 12_000,
      timeoutMsg: `toast matching ${message} not found`,
    }
  );
}

export async function goHome() {
  const brand = await $("aside a.navbar-brand");
  await brand.click();
  await browser.pause(300);
}

/** Client-side navigation (BrowserRouter in the Tauri webview). */
export async function goto(path) {
  await browser.execute((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await browser.pause(450);
}

/** Open Add Contacts hub with Company tab active. */
export async function openAddCompanyHub() {
  await goto("/addcontacts");
  const companyTab = await $("button=Company");
  await companyTab.waitForClickable({ timeout: 10_000 });
  await companyTab.click();
}

/**
 * Unique company id in 1000–9999 for isolated runs.
 */
export function uniqueCompanyId() {
  return 1000 + Math.floor(Math.random() * 8999);
}
