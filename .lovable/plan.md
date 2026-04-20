
Add a KPI summary bar at the top of the Summary page and show counts on each filter dropdown.

## KPI Bar (top of page, above filters)

Compact card row showing aggregate counts across all filtered rows. Each KPI is a small card with a number + label.

**KPIs to display:**
1. **Total Customers** — count of all rows
2. **Healthy** — count where health resolves to Green
3. **At Risk** — count where health resolves to Red
4. **On Track** — count where status resolves to On Track (impl rows only)
5. **Off Track** — count where status resolves to Off Track (impl rows only)
6. **Live** — count where `live_status` includes "Live"
7. **In Onboarding** — count where `live_status` includes "Onboarding"
8. **In Installation** — count where `live_status` includes "Installation"
9. **Critical Escalations** — count where `escalation_status === 'critical'`
10. **Critical Product Gaps** — count where `product_gaps_status === 'critical'`

Layout: responsive grid (`grid-cols-2 md:grid-cols-5`) of small `Card` tiles — large number, small muted label. Compact (py-3) so it doesn't dominate the page.

KPIs reflect the **filtered** dataset (so they update live as the user toggles filters/search), making them act as a real-time summary.

## Filter chip counts

The page currently has filter dropdowns (Domain, Live Status, etc.) at the top. For each option in every filter dropdown, append a count badge showing how many rows in the **currently filtered dataset (excluding that filter itself)** match that option. This is the standard "facet count" pattern — toggling Domain still shows accurate Live Status counts.

**Implementation approach:**
- Helper `getOptionCount(columnKey, optionValue)`: applies all filters EXCEPT the one being rendered, then counts rows where `cellValue(row, columnKey) === optionValue`.
- In the filter dropdown rendering (likely `TableHeaderFilter` or inline `Popover` checkboxes), render the label as `Option name (12)`.

If the existing filter UI is a shared `TableHeaderFilter` component, I'll extend its options API to accept `{ value, label, count }` so counts render alongside labels without duplicating logic.

## Files touched

1. `src/pages/app/implementation/BoardSummary.tsx` — Add KPI bar component above the filter row; compute counts from filtered data; wire facet counts into filter options.
2. (If needed) `src/components/ui/table-header-filter.tsx` — extend option type to include optional `count` for badge rendering.

## Notes

- All computation is client-side from the existing query result — no DB or service-layer changes.
- KPIs and facet counts both react to filters/search for a consistent "live drill-down" feel.
- BAU rows are excluded from On Track / Off Track counts (those KPIs only apply to implementation rows, matching the existing column logic).
