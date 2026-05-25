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
npm run tauri dev
```

Build installer:

```bash
npm run tauri build
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/` | React UI, services, utilities |
| `src-tauri/src/` | SQLite schema, Tauri commands |
| `Cleanroom.txt` | Full functional specification |

## Notes

- Invoice display number = `Id + 10000`
- Invoice statuses: Draft (0), Submitted (1), Paid (2)
- System Tests (`/test`) nav entry is omitted per cleanroom scope
- Legacy routes (`/counter`, `/weather`, etc.) are not implemented
