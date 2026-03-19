

## Bug Fix: Products Tab — "Factories not configured"

### Root Cause
`SolutionsProducts.tsx` line 55 queries `solution_factories` with `.eq('solutions_project_id', projectId)`, but `solution_factories` has no `solutions_project_id` column. Factories are linked through the portal: `solutions_projects` -> `solution_portals` -> `solution_factories` (via `portal_id`).

The network logs confirm a 400 error: `column solution_factories.solutions_project_id does not exist`.

### Fix
In `src/pages/app/solutions/tabs/SolutionsProducts.tsx`, update `fetchHierarchy` to:
1. First query `solution_portals` for the project's portal ID
2. Then query `solution_factories` using `.eq('portal_id', portalId)` instead of the non-existent `solutions_project_id`

This matches the pattern already used in `useFactoryConfig.ts`.

### File Changed
- `src/pages/app/solutions/tabs/SolutionsProducts.tsx` — fix `fetchHierarchy` function (lines 51-80)

