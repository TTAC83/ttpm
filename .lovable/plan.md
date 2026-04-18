

The user wants BAU customers added to the Board Summary at `/app/implementation/board-summary`. Currently it only shows implementation projects (IoT/Vision/Hybrid). BAU customers have their own weekly review system (`bau_weekly_reviews`) with health, churn_risk, status, escalation.

Let me check the current BoardSummary structure and BAU data shape to plan integration.

Looking at:
- `src/lib/executiveSummaryService.ts` — fetches projects + impl_weekly_reviews
- `src/lib/bauWeeklyService.ts` — already has `getBauBoardSummary` returning customer_name, health, churn_risk, status
- `src/pages/app/implementation/BoardSummary.tsx` — current table

Plan:

## Add BAU Customers to Board Summary

### Approach
Append BAU customer rows to the existing implementation projects table with a "Type" indicator column so users can distinguish Implementation projects from BAU customers. Both share similar fields (customer name, health) so they can coexist in one view.

### Data fetching changes (`src/lib/executiveSummaryService.ts`)
- Extend `ExecutiveSummaryRow` interface with:
  - `row_type: 'implementation' | 'bau'`
  - `churn_risk: string | null` (BAU has it, impl shows null)
  - `bau_status: string | null` (BAU's status field)
- After fetching implementation rows, fetch BAU customers with their most recent weekly review (reuse logic from `getBauBoardSummary` in `bauWeeklyService.ts`)
- Map BAU customers into the same row shape:
  - `customer_name` = BAU customer name
  - `project_name` = site_name or "BAU"
  - `customer_health` = review.health
  - `churn_risk` = review.churn_risk
  - All implementation-specific fields (phases, gaps, escalation, dates) = null
- Return combined array

### UI changes (`src/pages/app/implementation/BoardSummary.tsx`)
- Add a **Type** column at the start showing a badge: "Implementation" (blue) or "BAU" (purple)
- Add a **Churn Risk** column (only meaningful for BAU rows; show "—" for implementation)
- Add filter toggle in header: "All / Implementation only / BAU only" using a small button group or Select
- Update sorting to handle the new columns
- For BAU rows, leave implementation-only cells (phases, product gaps, escalation, planned go-live, contract signed) blank or show "—"
- Update PDF and Excel exports to include the Type column and filtered scope

### Files to modify
| File | Change |
|------|--------|
| `src/lib/executiveSummaryService.ts` | Fetch + merge BAU customers into rows |
| `src/pages/app/implementation/BoardSummary.tsx` | Add Type column, Churn Risk column, filter toggle, update exports |

### Edge cases
- BAU customers without any weekly review yet: include with health = null (shown as "Not Set")
- Filter persists during the session (component state, no need to save)
- Sorting by health/customer_name works across mixed types

