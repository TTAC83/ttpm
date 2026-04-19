

## Remove Type Column + Add Implementation Lead, Tech Lead, Tech Sponsor

### Data fetching changes (`src/lib/executiveSummaryService.ts`)

**1. Add lead fields to `ExecutiveSummaryRow`:**
- `implementation_lead_name: string | null`
- `tech_lead_name: string | null`
- `tech_sponsor_name: string | null`

**2. Update queries:**
- Add `implementation_lead, tech_lead, tech_sponsor` to the `projects` select.
- Add `implementation_lead, tech_lead, tech_sponsor` to the `bau_customers` select.
- Collect all unique user IDs across both result sets, then do a single batch query: `profiles.select('user_id, name').in('user_id', ids)` to build a `userId → name` map.
- Map names into both impl rows and bau rows.

### UI changes (`src/pages/app/implementation/BoardSummary.tsx`)

**1. Remove the Type column** — delete the `TableHead` and `TableCell` for Type. Update colSpan from 6 → 8 (we're removing 1, adding 3, so net 8 columns total: Domain, Customer, Project, Contract Signed, Planned Go Live, Impl Lead, Tech Lead, Tech Sponsor).

**2. Add three new columns** (after Planned Go Live):
- "Implementation Lead"
- "Dev/Tech Lead"
- "Dev/Tech Sponsor"
- Each cell shows the name or "—" when null. All sortable.

**3. Keep the Type filter dropdown** in the header (still useful even without the column) — it filters rows by implementation/BAU.

**4. Update PDF export:**
- Remove "Type" from headers.
- Add "Implementation Lead", "Tech Lead", "Tech Sponsor" to headers.
- Adjust `colWidths` (PDF is A4 landscape ≈ 280mm usable; use widths like `[22, 40, 40, 28, 28, 35, 35, 35]`).

**5. Update Excel export:**
- Remove "Type" key.
- Add "Implementation Lead", "Tech Lead", "Tech Sponsor" keys.
- Adjust `wch` widths accordingly.

### Files to modify
| File | Change |
|------|--------|
| `src/lib/executiveSummaryService.ts` | Fetch lead user IDs + resolve names via profiles batch query |
| `src/pages/app/implementation/BoardSummary.tsx` | Remove Type column; add 3 lead columns; update sort + exports |

### Edge cases
- Lead fields are nullable on both `projects` and `bau_customers` → display "—".
- Single batched profile fetch avoids N+1 queries.
- Type filter dropdown remains functional even though the visible Type column is gone.

