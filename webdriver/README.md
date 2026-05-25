# WebDriver (real Tauri runtime)

These tests drive the **built desktop app** through [`tauri-driver`](https://v2.tauri.app/develop/tests/webdriver/) and WebDriverIO. Unlike Playwright (`tests/e2e`), there is **no IPC mock** — commands hit SQLite via `PAINT_CONTRACTOR_DB_PATH` and native dialogs use the real Tauri dialog plugin.

## Prerequisites

| Platform | Requirement |
|----------|-------------|
| All | `cargo install tauri-driver --locked` |
| Windows | `msedgedriver.exe` on `PATH`, version-matched to Edge/WebView2 ([msedgedriver-tool](https://github.com/chippers/msedgedriver-tool)) |
| Linux | `WebKitWebDriver` / `webkit2gtk-driver`, plus GTK/WebKit build deps (same as Tauri) |

From the repo root:

```bash
npm run setup:msedgedriver   # Windows only — downloads matching Edge driver
cargo install tauri-driver --locked
cd webdriver/webdriverio && npm install
```

## Run locally

```bash
# Full real-runtime suite (builds debug binary, isolated temp DB)
npm run test:webdriver

# Same, but only destructive / confirm specs (rebuilds with VITE_AUTO_CONFIRM=1)
npm run test:webdriver:destructive
```

The first run compiles `src-tauri/target/debug/paint-contractor(.exe)` and may take several minutes.

## Layout

```
webdriver/
  README.md
  scripts/
    setup-msedgedriver.ps1
  webdriverio/
    wdio.conf.js              # default — no auto-confirm
    wdio.destructive.conf.js  # delete flows (VITE_AUTO_CONFIRM=1 at build)
    test/
      helpers.js
      specs/
        smoke-navigation.spec.js
        home-company-info.spec.js
        add-company.spec.js
        job-catalog.spec.js
        contacts-company.spec.js
        finance-pages.spec.js
        create-invoice.spec.js
        destructive-delete.spec.js   # only in destructive config
```

## CI

`.github/workflows/webdriver.yml` runs on `windows-latest` and `ubuntu-latest` (macOS WKWebView has no classic driver). Playwright mock E2E remains the fast default in `ci.yml`; WebDriver is the **real-runtime gate**.

## Test DB isolation

`wdio.conf.js` sets `PAINT_CONTRACTOR_DB_PATH` to a temp `app.db` before spawning `tauri-driver`, so production data under `%LocalAppData%` is never touched.

## Native confirm dialogs

Decline-path delete coverage stays in Playwright (`tests/e2e/confirm-delete.spec.ts`). WebDriver destructive specs use a **debug-only** build flag `VITE_AUTO_CONFIRM=1` (see `src/utils/confirm.ts`) because OS-native dialogs are not automatable via WebDriver.
