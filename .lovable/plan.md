
Hide the On Track / Off Track icon for any customer whose `live_status` indicates they are Live.

## Change

In `src/pages/app/implementation/BoardSummary.tsx`:

- **Cell rendering** (On Track column): if `row.live_status` contains "Live" (case-insensitive), render `—` instead of the CheckCircle2/XCircle icon. BAU rows already render `—` — keep that behavior.
- **`onTrackLabel` helper**: return `'—'` when the row is Live, so:
  - Filter dropdown facet counts group Live rows under `—` (not "On Track"/"Off Track").
  - PDF/Excel exports show `—` for Live rows.
- **KPI bar**: exclude Live rows from both the **On Track** and **Off Track** counts (they no longer have a tracking status).

## Files touched

- `src/pages/app/implementation/BoardSummary.tsx` — single-file change to cell renderer, label helper, and KPI calculation.

No DB or service-layer changes.
