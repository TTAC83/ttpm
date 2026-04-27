## Goal

When reviewing a customer for the current week, surface **last week's review** at a glance so the reviewer doesn't have to flip between weeks. Make it scannable, non-intrusive, and zero extra DB cost.

## UX approach

**Where:** A new collapsible "Last week" panel sits **directly above the "Weekly Review" controls card** for the selected customer. It's the natural reading order — context first, then this week's input.

**What it shows** (compact, two-row layout):
- **Header row**: `Last week · {week label}` + small status chips
  - Project Status pill (green "On track" / red "Off track" / muted "Not set")
  - Customer Health pill (green "Healthy" / red "At risk" / muted "Not set")
  - Churn Risk pill (only if set)
  - Reason Code pill (only if status/health was negative)
- **Body** (two columns on desktop, stacked on mobile):
  - **Notes / Escalation** — full text, muted card background
  - **Weekly Summary** — full text, muted card background
  - Each block shows `—` when empty, with a subtle "(none recorded)" hint

**Interaction:**
- Panel is **collapsed by default** when this week already has a saved status/health (avoid noise once the user is mid-review).
- Panel is **expanded by default** when this week is still blank (max value when starting fresh).
- Header has a **"Copy to this week"** ghost button → pre-fills `notes`, `weeklySummary`, `projectStatus`, `customerHealth`, `reasonCode` into the form fields (does NOT auto-save; user reviews/edits and the existing debounced auto-save persists). Disabled when there is no previous review.
- Empty state when no prior review exists: small muted line "No previous review for this customer."

**Sidebar enhancement (small, optional but high-value):**
- In the customer list, when this week has no review yet but a prior week does, show a tiny grey dot icon next to the customer name with tooltip `"Last reviewed: {date} — {status}"`. Helps the reviewer see who has carryover context vs. fresh customers. *(Stretch — included in the same change since data is already loaded.)*

## Data approach (efficient)

**No new queries, no new columns.** The page already calls `loadPreviousReview(companyId, weekStart)` via `previousReviewQ` — currently used only for inheriting phases/hypercare. That same query already returns `project_status`, `customer_health`, `notes`, `reason_code`, `weekly_summary`, `churn_risk`. We just render those fields in the new panel.

The function uses an indexed `(company_id, week_start)` lookup with `LIMIT 1`, so there's no additional DB cost.

To show the previous week's **date label** in the header, extend `loadPreviousReview` to also select `week_start` (one extra column, same row) and add it to the `ImplWeeklyReview` type.

For the sidebar dot (stretch), the existing `companies-health` query for the current week can be paired with a single batched query: `select company_id, max(week_start) ... where week_start < {currentWeek} group by company_id`. One round-trip, ~30 rows. Cached for the session.

## Files touched

1. **`src/lib/implementationWeekly.ts`**
   - Add `week_start` to the `select` in `loadPreviousReview` and to the `ImplWeeklyReview` return shape (optional field `previous_week_start?: string`).
   - *(Stretch)* Add `loadLastReviewedMap(beforeWeekStart): Promise<Map<companyId, {week_start, project_status, customer_health}>>`.

2. **`src/pages/app/ImplementationWeeklyReview.tsx`**
   - New small component `LastWeekContextPanel` (rendered just before line 1587 "Weekly Review" Card) that consumes `previousReviewQ.data` and exposes a "Copy to this week" handler that calls the existing `setProjectStatus / setCustomerHealth / setNotes / setReasonCode / setWeeklySummary` setters.
   - Default-collapsed logic: `defaultOpen = !reviewQ.data?.project_status && !reviewQ.data?.customer_health`.
   - *(Stretch)* Wire `loadLastReviewedMap` into the sidebar list to render a `History` icon with tooltip.

## Out of scope

- Showing more than one week back (a "history" drawer can come later if needed).
- Editing last week's review from this panel (read-only — keeps the mental model clean: this screen is for *this* week).
- Phase carry-forward UX (already implemented).
