# Pulse Dashboard

`pulse-dashboard` is a Vite + React frontend for exploring BD inventory projection output.

It includes three views:

- `Allocation Table`: SKU-site matrix with weekly pivot data
- `Alert Center`: alert triage, filtering, selection, and row-level drill-down
- `Analytics`: KPI cards and charts for demand, supply, inventory, shortage, excess, and alert mix

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Recharts
- Papa Parse
- Framer Motion
- Lucide React

## Project Structure

```text
pulse-dashboard/
|-- generated_data/      # source CSV/XLSX files
|-- public/
|   `-- data/            # published dashboard data + manifest
|-- scripts/
|   `-- setup.js         # scans generated_data and writes manifest.json
|-- src/
|   |-- components/
|   |-- context/
|   |-- hooks/
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- package.json
`-- vite.config.js
```

## Setup

Install dependencies:

```bash
npm install
```

Publish the latest generated data into `public/data/`:

```bash
npm run setup
```

Start the dev server:

```bash
npm run dev
```

## Data Flow

The browser does not read files directly from your filesystem.

Instead, the flow is:

1. Upstream Python/data generation writes files into `generated_data/`
2. `npm run setup` scans `generated_data/`
3. Matching `.csv` and `.xlsx` files are copied into `public/data/`
4. `public/data/manifest.json` is generated
5. The frontend reads the manifest and fetches the resolved `/data/...` URLs

This removes the old hardcoded runtime dependency on fixed filenames such as `/data/projection_results.csv`.

## Data Roles

The setup script tries to resolve these roles from the files present in `generated_data/`:

- `pivot`: matches `pivot_visualization.csv`
- `projection`: matches `final_projection_results*.csv` or `projection_results.csv`
- `triage`: matches `triage_view*.csv`
- `workbook`: matches `pulse_pivot.xlsx`

`pivot` and `projection` are required.

`triage` is optional. If it is missing, the dashboard still loads, but MSTN/ESTN enrichment is skipped.

## Runtime Loader

The frontend loader lives in `src/hooks/useData.js`.

At startup it:

- fetches `/data/manifest.json`
- resolves the URLs for `pivot`, `projection`, and `triage`
- loads CSV data with Papa Parse
- merges triage metrics into projection rows when available
- derives a DC-only dataset by excluding factory sites from analytics and alert views

## Notes

- `Alert Center` dispatch is UI/state simulation only; it does not call a backend API
- If setup succeeds but the UI still shows a data-load error, check `public/data/manifest.json`
- If source files change, rerun `npm run setup` before starting or refreshing the app

## Quick Start

```bash
cd pulse-dashboard
npm install
npm run setup
npm run dev
```
