

## Add Configuration Gap Table to Solutions Factory Page

### What It Does

A new "Configuration Gaps" card will appear at the top of the Factory tab on Solutions projects. It auto-scans the factory hierarchy data and displays a table of missing items -- guiding users to complete the configuration. When everything is complete, it shows a green "all clear" message.

### Gap Detection Rules

The table will detect these gaps from the existing factory data:

| Category | Gap Condition |
|----------|--------------|
| Portal | No portal URL set |
| Factories | No factories added |
| Shifts | A factory has no shift patterns |
| Groups | A factory has no groups |
| Lines | A group has no lines defined |

Each row in the table shows: the gap category, what's missing, and where (e.g. which factory or group name).

### UI Design

- A `Card` with title "Configuration Gaps" placed above the existing Portal/Factory drill-down content
- Inside: a simple table with columns: **Area**, **Issue**, **Location**
- When all checks pass: a green success banner instead of the table ("Factory configuration is complete")
- Uses existing Badge component (destructive variant for gaps, green for complete)

### Technical Changes

**1. New component: `src/components/factory-config/FactoryConfigGaps.tsx`**
- Accepts the same data the `SolutionsFactoryConfig` already has: `portal`, `factories`, `shifts`, `groups`, `lines`
- Pure computation -- no database calls needed (data is already loaded by `useFactoryConfig`)
- Renders a `Card` with a `Table` listing detected gaps

**2. Update `src/components/factory-config/SolutionsFactoryConfig.tsx`**
- Import and render `FactoryConfigGaps` at the top of the page, passing all the factory hierarchy state
- No changes to the hook or any other files

### No Database Changes Required

All data needed is already fetched by `useFactoryConfig`. This is a purely frontend feature.

