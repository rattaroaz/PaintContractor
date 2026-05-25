# DKSK Paint Contractor

Desktop rebuild of the **DKSK Official — Painting Contractor Management System** from the [Cleanroom.txt](./Cleanroom.txt) specification.

## Stack

- **Tauri 2** (Rust backend)
- **React 18 + TypeScript** (frontend)
- **SQLite** (`%LocalAppData%\PaintContractor\Database\app.db`)
- **Bootstrap 5** UI matching the cleanroom layout and colors

## Features

- My Company profile (home)
- Operations: Start Job → draft invoice → Create Invoice → submit
- Finance: Accounts Receivable, Aging, Sales, Payroll, Contractor Jobs, Active Jobs
- Contacts: companies with supervisors/properties, contractors
- Job catalog (replace-all save)
- Import/Export: database backup/restore, CSV import (companies, properties, sales)
- PDF/Excel export from finance grids
- Update settings (GitHub release check)

## Development

Prerequisites: [Node.js](https://nodejs.org/), [Rust](https://rustup.rs/), Windows 10+ (WebView2).

```bash
npm install
npm run dev          # launches the Windows desktop app (Tauri + WebView2)
```

Do **not** use the Vite URL in Chrome for normal use — that is browser-only and cannot reach SQLite.

| Command | Purpose |
|---------|---------|
| `npm run dev` | **Windows app** (recommended) |
| `npm run dev:vite` | Frontend only in browser (broken without mock) |
| `npm run dev:test` | Browser with mocked Tauri IPC (Playwright) |
| `npm run tauri build` | Release `.exe` / installer |

Build installer:

```bash
npm run tauri build
```

## Logging

The app logs to **stdout** (visible in the terminal when using `npm run dev`) and to a rotating file via Tauri’s log directory.

| Location | Typical Windows path |
|----------|----------------------|
| SQLite database | `%LocalAppData%\PaintContractor\Database\app.db` |
| Log files | `%LocalAppData%\com.dksk.paintcontractor\logs\` (file prefix `app.log`) |

On startup the app records the database path, log directory, and version (see **Import / Export** page for the DB path, or check the latest `app.log`).

- **Frontend**: `src/utils/logger.ts` — all `api.*` calls go through `invokeLogged` with timing; errors in toasts and `ErrorBoundary` are logged.
- **Backend**: every Tauri command logs `command.start` / `command.ok` / `command.error` with elapsed time; business validation failures log `command.business_error` via `OperationResult::err`.
- **Sensitive fields** (email, phone, address, raw backup bytes) are redacted in frontend log context.

For verbose IPC traces in development, run the desktop app in debug mode; production builds log destructive IPC at `info` and skip routine `debug` noise.

## Project layout

| Path | Purpose |
|------|---------|
| `src/` | React UI, services, utilities |
| `src-tauri/src/` | SQLite schema, Tauri commands |
| `tests/` | Vitest + Playwright suites (unit, integration, plugin, contract, property, snapshot, smoke, E2E) — see [tests/README.md](./tests/README.md) |
| `src-tauri/tests/` | `cargo test` integration + property + snapshot + contract suites |
| `Cleanroom.txt` | Full functional specification |

## Testing

A comprehensive production-grade test framework is documented in
[tests/README.md](./tests/README.md). Highlights:

- **Vitest** — 269 tests across unit, integration, Tauri plugin, contract,
  property-based (fast-check), snapshot, and a11y (axe-core) suites
- **Cargo** — 80 Rust tests across unit, integration (real SQLite via
  `tempfile`), property (`proptest`), snapshot (`insta`), and contract suites
- **Playwright** — 31 tests covering E2E flows (incl. confirm-before-delete),
  route smoke matrix, against the real React build with a mocked Tauri IPC layer
- **WebDriverIO + tauri-driver** — real desktop runtime against debug
  `paint-contractor` with isolated SQLite (`webdriver/README.md`)
- **Total: ~400 tests** spanning every layer of the application
- **Coverage gates** — ~67% line coverage with enforced minimum thresholds
- **Coverage thresholds** enforced via `vitest.config.ts`
- **GitHub Actions CI** (`.github/workflows/ci.yml`) runs Vitest, Rust,
  Playwright (mock IPC), `tsc`, and `clippy` on every push/PR — this is the
  fast default gate
- **WebDriver CI** (`.github/workflows/webdriver.yml`) runs separately on
  Windows and Linux against the real desktop binary and SQLite — not part of
  the main CI workflow

```bash
npm test              # all Vitest suites
npm run test:coverage # Vitest + V8 coverage (with thresholds)
npm run test:rust     # cargo test (all Rust suites)
npm run test:e2e      # Playwright E2E (mock IPC — same as CI playwright job)
npm run test:smoke    # Playwright smoke matrix (mock IPC)
npm run test:all      # Vitest + cargo test + Playwright (matches main CI scope)
npm run test:webdriver # real Tauri + SQLite (matches webdriver.yml)
npm run test:full     # test:all + both WebDriver suites (pre-release / local)
```

## Notes

- Invoice display number = `Id + 10000`
- Invoice statuses: Draft (0), Submitted (1), Paid (2)
- System Tests (`/test`) nav entry is omitted per cleanroom scope
- Legacy routes (`/counter`, `/weather`, etc.) are not implemented
