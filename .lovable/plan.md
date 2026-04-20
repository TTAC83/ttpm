
Add a "Weekly Summary" column to the Summary table sourced from the most recently reviewed weekly review for each customer.

## Data source

- **Implementation rows** → `impl_weekly_reviews.weekly_summary`, picking the row with the **latest `reviewed_at`** for that company (not the latest `week_start` — the user specified "most recently entered today", so we want recency by entry timestamp).
- **BAU rows** → `bau_weekly_reviews` has no `weekly_summary` column. Closest equivalent is `escalation` (the free-text field captured during BAU weekly review). I'll use `escalation` for BAU rows and label the column "Weekly Summary" uniformly. Empty/missing → `—`.

## Service layer (`src/lib/executiveSummaryService.ts`)

- Extend the existing `allRecentReviews` query to also select `weekly_summary` and `reviewed_at`.
- Build a `weeklySummaryMap = Map<company_id, string>` by iterating through reviews ordered by `reviewed_at desc`, taking the first non-empty `weekly_summary` per company.
- Extend the existing BAU reviews query to also select `escalation` and `reviewed_at`, ordered by `reviewed_at desc`, and build a `bauWeeklySummaryMap` (first non-empty `escalation` per `bau_customer_id`).
- Add `weekly_summary: string | null` to the `ExecutiveSummaryRow` interface.
- Populate `weekly_summary` in both `implRows` and `bauRows`.

## UI (`src/pages/app/implementation/BoardSummary.tsx`)

- Add `'weekly_summary'` to `ColumnKey` union and to `COLUMNS` array (label: **"Weekly Summary"**), placed after **"Live Status"** for logical grouping with other status info.
- Add `weekly_summary: []` entry to the `filters` state initialiser and to `clearAllFilters`.
- The existing generic `cellValue` helper already handles arbitrary string columns — no special case needed (will render `—` when null/empty).
- **Cell rendering**: weekly summaries can be long. Render the cell with `max-w-[280px]`, `truncate` class, and a `title={value}` attribute so the full text appears on hover. Keeps the row height stable.
- **PDF/Excel export**: existing loop over `COLUMNS` automatically includes the new column. Add a column width entry (~40mm in PDF colWidths array, ~40 wch in Excel) so it renders sensibly.
- **Filter dropdown**: facet counts work automatically through the existing `filterOptions` builder. Free-text values may produce many unique options, but this matches the pattern used by other text columns (e.g. customer name) and the user can still search/filter.

## Files touched

1. `src/lib/executiveSummaryService.ts` — add `weekly_summary` to type + queries + row mapping.
2. `src/pages/app/implementation/BoardSummary.tsx` — add column, filter slot, export widths, truncated cell rendering.

No DB or migration changes required.
