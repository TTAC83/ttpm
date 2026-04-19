
Replace the "Contract Signed" column with a "Project Age" column on the Board Summary.

## Behavior

- **Column header**: "Project Age" (replaces "Contract Signed")
- **Value**: Time elapsed since `contract_signed_date` until today, formatted as `Xm Yw Zd` (e.g., `3m 2w 4d`).
  - Skip zero units only when leading (e.g., `2w 3d` if under a month, `5d` if under a week).
  - If no contract signed date → show `—`.
- **Live override**: If `live_status` is exactly `['Live']` (sole status), show the green Live badge with checkmark in this cell instead of the age (mirroring the Planned Go Live behavior).

## Implementation (1 file)

**`src/pages/app/implementation/BoardSummary.tsx`**

1. Rename column key `contract_signed_date` → `project_age` in `COLUMNS`, `filters` state, and `clearAllFilters`. Update the `ColumnKey` type.
2. Add a helper `formatProjectAge(signedDate: string | null): string`:
   - Use `differenceInMonths`, `differenceInWeeks`, `differenceInDays` from `date-fns` to compute months / remaining weeks / remaining days.
   - Return `—` when null.
3. Update `cellValue` so `project_age` returns the formatted string (used for filter options, sort, and exports).
4. Update sorting: for `project_age`, sort by the underlying `contract_signed_date` (older = larger age) so values order naturally instead of alphabetically.
5. Replace the `<TableCell>` for the contract-signed column with new logic:
   ```tsx
   {Array.isArray(row.live_status) && row.live_status.length === 1 && row.live_status[0] === 'Live' ? (
     <Badge className="bg-success hover:bg-success text-success-foreground gap-1">
       <CheckCircle2 className="h-3 w-3" /> Live
     </Badge>
   ) : (
     formatProjectAge(row.contract_signed_date)
   )}
   ```
6. Update PDF/Excel exports — they already use `cellValue`, so they automatically pick up the formatted age. Adjust the PDF column width slightly (the age string is shorter than a date).

## Notes

- No DB or service-layer changes needed; `contract_signed_date` is already returned by `fetchExecutiveSummaryData`.
- Filter chips at the top (Domain, Live Status) are unaffected.
- Filter dropdown for the Project Age column will list distinct age strings as they appear today (acceptable for an at-a-glance board).
