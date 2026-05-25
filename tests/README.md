# Test framework

This repo ships a complete, multi-layer test framework covering both the
TypeScript frontend and the Rust/Tauri backend. Everything is wired to
`npm` and `cargo` scripts so a single command can run any individual
layer or the full pyramid.

## Layout

```
tests/
  setup/                Vitest global setup (jest-dom matchers, IPC reset)
  helpers/              Shared mocks, fixtures, Zod contracts
  unit/                 Pure-function + small-component Vitest tests
  integration/          Multi-module Vitest tests + every-page route tests
  tauri-plugins/        Plugin-dialog + plugin-fs Vitest tests
  contract/             Zod schemas validating the FE<->BE JSON contract
  property/             fast-check property-based tests (invoice/jobs, filters, csv)
  snapshot/             Vitest DOM-fragment snapshots
  a11y/                 axe-core accessibility audits
  smoke/                Playwright route smoke matrix (every route mounts)
  e2e/                  Playwright full user-flow specs

src-tauri/
  src/db.rs                         -> `#[cfg(test)] mod tests` (unit)
  src/commands.rs                   -> `#[cfg(test)] mod tests` (unit)
  tests/common/mod.rs               -> Tempdir SQLite harness
  tests/common/fixtures.rs          -> Reusable Rust test builders
  tests/db_integration.rs           -> Job catalog + contractor lifecycle
  tests/invoice_integration.rs      -> Invoice CRUD, validation, filters, AR
  tests/csv_import_integration.rs   -> Companies/Properties/Sales CSV imports
  tests/company_graph_integration.rs-> Company / supervisor / property cascade
  tests/backup_restore_integration.rs-> Database backup + restore
  tests/my_company_info_integration.rs-> MyCompanyInfo CRUD
  tests/payroll_integration.rs      -> Contractor CRUD + payroll aggregation
  tests/job_catalog_integration.rs  -> Job catalog upsert / delete / replace_all
  tests/property.rs                 -> proptest invariants (jobs, payments, idempotence, replace_all)
  tests/snapshot.rs                 -> insta JSON snapshots
  tests/contract.rs                 -> Serialized key-shape contracts
```

## Continuous Integration

### Main CI (every push / PR)

`.github/workflows/ci.yml` runs five parallel jobs. This is the **fast
default gate** — Playwright uses **mocked Tauri IPC** (`VITE_TAURI_MOCK=1`),
not the real desktop runtime.

| Job | What it validates |
|-----|-------------------|
| `vitest` | Unit, integration, contract, property, snapshot, a11y (+ coverage thresholds) |
| `rust` | `cargo test` (real SQLite in temp dirs) |
| `playwright` | E2E + smoke matrix (mock IPC) |
| `typecheck` | `tsc --noEmit` + production Vite build |
| `clippy` | `cargo fmt --check` + `cargo clippy -D warnings` |

`npm run test:all` matches this scope locally (Vitest + Rust + Playwright).

### WebDriver CI (separate workflow)

`.github/workflows/webdriver.yml` runs **WebDriverIO + tauri-driver** on
`windows-latest` and `ubuntu-latest` against the real debug binary and an
isolated temp SQLite file. It does **not** run inside `ci.yml`. See
`webdriver/README.md`. Use `npm run test:full` before releases to run both
tiers locally.

## NPM scripts

| Script                  | What runs                                                                  |
|-------------------------|----------------------------------------------------------------------------|
| `npm test`              | All Vitest suites (unit, integration, plugin, contract, property, snapshot)|
| `npm run test:unit`     | Unit tests only                                                            |
| `npm run test:integration` | Vitest integration tests                                                |
| `npm run test:plugins`  | Vitest Tauri-plugin integration tests                                      |
| `npm run test:contract` | Vitest contract tests                                                      |
| `npm run test:property` | Vitest property-based tests (fast-check)                                   |
| `npm run test:snapshot` | Vitest snapshot tests                                                      |
| `npm run test:coverage` | Vitest + V8 coverage report (`coverage/frontend`)                          |
| `npm run test:rust`     | `cargo test` (Rust unit + integration + property + snapshot + contract)    |
| `npm run test:smoke`    | Playwright smoke matrix (every route mounts)                               |
| `npm run test:e2e`      | Playwright full E2E suite                                                  |
| `npm run test:a11y`     | axe-core accessibility audits                                              |
| `npm run test:all`      | Vitest + cargo test + Playwright E2E + Playwright smoke                    |
| `npm run test:webdriver`| Real Tauri runtime (WebDriverIO + tauri-driver)                              |
| `npm run test:webdriver:destructive` | WebDriver delete flows (`VITE_AUTO_CONFIRM=1` build)          |
| `npm run test:full`     | `test:all` + both WebDriver suites                                         |
| `npm run setup:msedgedriver` | Windows: download Edge WebDriver matching installed Edge              |

## How the Tauri IPC mock works

Both Vitest and the Playwright dev server share a single approach:
production code never imports anything test-specific, it just calls
`@tauri-apps/api/core#invoke` and the Tauri dialog/fs plugins. Those go
through `window.__TAURI_INTERNALS__.invoke`, which the test harness
shims:

- **Vitest**: `tests/helpers/tauri-mock.ts` installs the shim during
  setup. Tests call `mockInvoke(cmd, handler)` to script responses for
  each command, and `getInvokeCallsFor(cmd)` to inspect what was called.

- **Playwright**: when the dev server boots with `VITE_TAURI_MOCK=1`
  (the `dev:test` script), `src/test-utils/install-tauri-mock.ts` is
  loaded into the page and installs an in-memory backend. Specs can
  override individual handlers via
  `window.__installMockHandler__(cmd, fn)` from `page.addInitScript`.

## Two-tier E2E strategy

| Tier | Runner | Runtime | Speed | Purpose |
|------|--------|---------|-------|---------|
| Fast | Playwright (`tests/e2e`, `tests/smoke`) | Vite + `VITE_TAURI_MOCK=1` | Seconds | CI default; deterministic IPC |
| Thorough | WebDriverIO (`webdriver/webdriverio`) | Built `paint-contractor` + `tauri-driver` | Minutes | Real SQLite, real plugins, real WebView |

Playwright covers decline-path confirm dialogs via mocked
`plugin:dialog|message`. WebDriver destructive specs use a debug-only
`VITE_AUTO_CONFIRM` build flag because native OS dialogs are not
WebDriver-automatable.

### Application logging

- **Frontend**: `src/utils/logger.ts` + `src/invokeLogged.ts` (all `api.*` IPC traced)
- **Backend**: `src-tauri/src/log_util.rs` wraps every `#[tauri::command]`
- **Paths**: `get_logging_paths` command; startup logs version + DB + log dir
- **Tests**: `tests/unit/logger.test.ts` (redaction, destructive IPC args in
  production, `log_frontend` bridge); Rust `log_util` tests assert
  `OperationResult::err` emits `command.business_error` via
  `log_operation_failure`

## Updating snapshots

- TypeScript snapshots: `npx vitest run -u`
- Rust insta snapshots: `INSTA_UPDATE=always cargo test --manifest-path src-tauri/Cargo.toml --test snapshot`

## Adding tests

| Layer             | Where to add                                                |
|-------------------|-------------------------------------------------------------|
| Pure helper       | `tests/unit/*.test.ts` (Vitest) or inline `mod tests` in Rust|
| New API command   | `tests/integration/api.test.ts` + `src-tauri/tests/db_integration.rs` |
| Plugin call site  | `tests/tauri-plugins/*.test.ts`                             |
| Field rename      | `tests/contract/*` AND `src-tauri/tests/contract.rs`        |
| Math invariant    | `tests/property/*` (JS) / `src-tauri/tests/property.rs`     |
| User flow         | `tests/e2e/*.spec.ts` (mock) + `webdriver/webdriverio/test/specs` (real) |
| Boot/critical nav | `tests/smoke/*.spec.ts`                                     |

## Test counts (current)

| Layer                         | Files | Tests |
|-------------------------------|-------|-------|
| Vitest unit                   | 12    | ~110  |
| Vitest integration            | 5     | ~45   |
| Vitest tauri-plugins          | 2     | 10    |
| Vitest contract               | 1     | 11    |
| Vitest property (fast-check)  | 5     | 62    |
| Vitest snapshot               | 1     | 6     |
| Vitest a11y (axe-core)        | 2     | 14    |
| Rust unit (`#[cfg(test)]`)    | 2     | 7     |
| Rust integration              | 9     | 55    |
| Rust property (proptest)      | 1     | 7     |
| Rust snapshot (insta)         | 1     | 7     |
| Rust contract                 | 1     | 12    |
| Playwright smoke              | 2     | 18    |
| Playwright E2E                | 5     | 13    |
| WebDriverIO (real runtime)    | 8     | ~20   |
| **Total**                     | **56**| **~400** |

Coverage thresholds enforced via `vitest.config.ts`:
lines ≥ 60, statements ≥ 60, functions ≥ 53, branches ≥ 54 (current run ~67% lines).

## Test taxonomy by purpose

The framework is structured so that any change that breaks behavior at
any level will fail at least one test, ideally several:

| Concern                              | Caught by                                                                            |
|--------------------------------------|--------------------------------------------------------------------------------------|
| Pure logic regression                | `tests/unit/*` + `tests/property/*` + `cargo test` unit + property                   |
| Wire-format / breaking field rename  | `tests/contract/*` (Zod) + `src-tauri/tests/contract.rs` (serde)                     |
| Backend SQL/data behavior            | `src-tauri/tests/*_integration.rs`                                                   |
| Reactive UI render regression        | `tests/unit/*.test.tsx` + `tests/snapshot/*` + `tests/integration/pages.test.tsx`    |
| User flow regression                 | `tests/e2e/*.spec.ts` (Playwright) + `webdriver/webdriverio` (tauri-driver)          |
| Boot / navigation regression         | `tests/smoke/*.spec.ts` (Playwright)                                                 |
| Accessibility regression             | `tests/a11y/*.test.tsx` (axe-core)                                                   |
| Output drift (e.g. JSON shape)       | `src-tauri/tests/snapshot.rs` (insta) + `tests/snapshot/*.snapshot.test.tsx`         |
| Cross-platform path / dialog issues  | `tests/tauri-plugins/*` + `tests/e2e/*` (real plugin shapes)                         |
