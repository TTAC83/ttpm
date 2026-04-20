
Rename the page to "Summary" and add visual icon indicators for **Customer Health** and **Project On Track** status, sourcing from the latest weekly review with a green default fallback.

## Changes

### 1. Rename page to "Summary"

- **`src/pages/app/implementation/BoardSummary.tsx`** — Update `<CardTitle>` from "BAU Board Summary" (or current title) to **"Summary"**. Update the PDF/Excel export filenames and PDF title accordingly (`summary.pdf`, `summary.xlsx`, "Summary" header).
- **`src/config/nav.ts`** — Update the nav label for the `/app/implementation/board-summary` route from its current name to **"Summary"**.

I'll keep the route URL (`/app/implementation/board-summary`) unchanged to avoid breaking bookmarks.

### 2. Add icon indicators for Customer Health & Project On Track

The data already flows through `fetchExecutiveSummaryData` (`customer_health: 'green' | 'red' | null` and `project_on_track: 'on_track' | 'off_track' | null`).

**Default-to-green rule**: When a customer has no entry in the latest weekly review (i.e. value is `null`), treat as `green` / `on_track` for display purposes. This applies to **implementation rows only** — BAU rows already have their own logic and aren't affected.

**Columns added** (positioned right after `customer_name`, before `domain`):
- `customer_health` — header "Health"
- `project_on_track` — header "On Track"

**Cell rendering**:
- **Customer Health**:
  - `green` or `null` → green filled circle icon (`Circle` from lucide, `fill-success text-success`)
  - `red` → red filled circle (`fill-destructive text-destructive`)
- **Project On Track**:
  - `on_track` or `null` → green `CheckCircle2`
  - `off_track` → red `XCircle`
- BAU rows: show health using the same logic; on-track column shows `—` (not applicable).

**Sorting/filtering/exports**:
- Add both keys to `ColumnKey`, `COLUMNS`, `filters` initial state, and `clearAllFilters`.
- `cellValue` returns human-readable strings: `"Green"` / `"Red"` for health, `"On Track"` / `"Off Track"` for status (using the green default for `null`). This drives filter dropdowns and PDF/Excel exports.

### Files touched
1. `src/pages/app/implementation/BoardSummary.tsx` — title rename, two new columns with icon cells, sorting/filter wiring, export label tweaks.
2. `src/config/nav.ts` — nav label rename.

No DB or service-layer changes needed.
