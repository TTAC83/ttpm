

## Add Factory Structure Diagram to Feasibility Gate Summary

### Overview

Add a visual tree/organogram diagram to the Feasibility Gate dialog that renders the full factory hierarchy: Portal URL -> Factories -> Groups -> Lines. This diagram will be built using pure CSS/HTML (nested flex containers with connector lines), matching the existing Site Structure pattern used on the Factory Configuration page.

### Data Fetching

The `FeasibilityGateDialog` already queries `solutions_lines` for counts. We will add queries for the factory config tables in the same `fetchSummary` function:

- `solution_portals` (filtered by `solutions_project_id`)
- `solution_factories` (filtered by `portal_id`)
- `factory_groups` (filtered by `factory_id` in fetched factories)
- `factory_group_lines` (filtered by `group_id` in fetched groups)

This reuses the same table structure as `useFactoryConfig.ts` but in a read-only, flat fetch within the dialog.

### Visual Design

A collapsible tree rendered below the existing KPI cards and above the sign-off section:

```text
Portal: customer.thingtrax.com
  |
  +-- Factory A
  |     |
  |     +-- Group 1
  |     |     +-- Line X (Vision)
  |     |     +-- Line Y (IoT)
  |     |
  |     +-- Group 2
  |           +-- Line Z (Both)
  |
  +-- Factory B
        |
        +-- Group 3
              +-- Line W (Vision)
```

Each node will use small icons and badges for solution type. The tree uses nested `div` elements with left-border connector lines (CSS-only, no external library needed).

### Technical Changes

**`src/components/FeasibilityGateDialog.tsx`**:

1. Extend `SummaryData` interface to include factory hierarchy data:
   - `portal: { url: string } | null`
   - `factories: { id, name, groups: { id, name, lines: { id, name, solution_type }[] }[] }[]`

2. In `fetchSummary`, add queries for `solution_portals`, `solution_factories`, `factory_groups`, `factory_group_lines` and nest them into the hierarchical shape above.

3. Add a new "Site Structure" section between the KPI cards and the sign-off area, rendering the tree with:
   - Globe icon + portal URL as the root
   - Factory icon + factory name as level 2
   - Folder icon + group name as level 3
   - Line/cable icon + line name + solution type badge as leaves
   - Left-border lines (`border-l-2`) and padding to create the tree visual

4. Widen the dialog from `max-w-lg` to `max-w-2xl` to accommodate the tree.

5. Wrap the content in a `ScrollArea` so large hierarchies don't overflow.

### Files Affected

| File | Change |
|------|--------|
| `src/components/FeasibilityGateDialog.tsx` | Add factory hierarchy fetch + tree diagram rendering |

No new files or database changes needed.
