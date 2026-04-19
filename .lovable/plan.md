
The user wants the Live Status column to show multiple statuses when more than one phase is active (e.g., both "Installation" and "Onboarding"), instead of only the highest-priority one.

Currently `derivePhaseStatus` returns a single value with priority Live > Onboarding > Installation. I need to change it to return all active phases.

## Plan: Show Multiple Active Phases in Live Status

### Changes to `src/lib/executiveSummaryService.ts`
- Change `live_status` type from a single string to `string[]` (array of active phases).
- Replace `derivePhaseStatus` with a function that returns all active phases in order: `['Installation', 'Onboarding', 'Live']`, filtering by which booleans are true.
- BAU rows continue to return `['Live']`.

### Changes to `src/pages/app/implementation/BoardSummary.tsx`
- Update the Live Status cell to render one Badge per active phase (stacked horizontally with a small gap, wrapping if needed).
- Use `default` variant for "Live" and `outline` for "Installation"/"Onboarding".
- Update `cellValue` for the `live_status` column to join the array with ", " for filtering, sorting, and exports (PDF/Excel).
- Filter options will list each individual combination that appears (e.g., "Installation", "Installation, Onboarding", "Live").

### Edge cases
- No phases set → show "—" (empty array).
- All three set → show all three badges.
- Sorting/filtering uses the joined string so it remains consistent across UI and exports.
