
Add an editable "Project/Product" column to the Board Summary table with a Product/Project dropdown per row.

## Data layer

New column on `projects` table (Implementation projects only — BAU rows in this view come from `bau_customers` and the user is focused on the implementation board):

- `project_classification` — text, nullable, CHECK constraint `IN ('Product','Project')`.

Migration:
```sql
ALTER TABLE public.projects
  ADD COLUMN project_classification text
  CHECK (project_classification IN ('Product','Project'));
```

For BAU rows, the cell will show `—` and be non-editable (BAU customers aren't classified this way). If the user later wants BAU classification too, we can add the same column to `bau_customers`.

## Service layer

`src/lib/executiveSummaryService.ts`
- Select `project_classification` in the implementation projects query.
- Add `project_classification: string | null` to each row in the returned dataset (BAU rows return `null`).

## UI layer

`src/pages/app/implementation/BoardSummary.tsx`

1. Add `'project_classification'` to `ColumnKey`, `COLUMNS` (label "Project / Product"), `filters` initial state, and `clearAllFilters`. Place it right after `domain`.
2. `cellValue`: return the raw value or `—`.
3. Render an inline `Select` (shadcn) inside the `<TableCell>`:
   - Options: `Project`, `Product`.
   - For BAU rows (`row.row_type === 'bau'`): render `—` text only.
   - On change: optimistic update via `queryClient.setQueryData`, then `supabase.from('projects').update({ project_classification: value }).eq('id', row.project_id)`. Toast on error and rollback.
   - Use `e.stopPropagation()` on the Select trigger so the row navigation click doesn't fire.
4. Filter dropdown for the column works automatically via `cellValue`.
5. PDF/Excel exports automatically include the new column via `cellValue`.

## Files touched

- New migration: `supabase/migrations/<timestamp>_add_project_classification.sql`
- `src/lib/executiveSummaryService.ts`
- `src/pages/app/implementation/BoardSummary.tsx`

## Notes

- Position: directly after Domain (logical grouping of project metadata).
- Default value: `null` (shown as `—`) until user picks.
- No RLS changes needed — existing `projects` update policies cover this.
