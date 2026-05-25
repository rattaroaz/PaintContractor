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
- **GitHub Actions CI** runs every layer + `tsc` + `cargo fmt`/`clippy`

```bash
npm test              # all Vitest suites
npm run test:coverage # Vitest + V8 coverage (with thresholds)
npm run test:rust     # cargo test (all Rust suites)
npm run test:e2e      # Playwright E2E
npm run test:smoke    # Playwright smoke matrix
npm run test:all      # Vitest + cargo test + Playwright (fast CI default)
npm run test:webdriver # real Tauri + SQLite (requires tauri-driver + Edge driver on Windows)
npm run test:full     # test:all + both WebDriver suites
```

## Notes

- Invoice display number = `Id + 10000`
- Invoice statuses: Draft (0), Submitted (1), Paid (2)
- System Tests (`/test`) nav entry is omitted per cleanroom scope
- Legacy routes (`/counter`, `/weather`, etc.) are not implemented
