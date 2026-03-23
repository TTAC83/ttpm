

## Yellow Row Highlighting + Custom Filter for Attributes Table

### Changes to `src/pages/app/admin/AttributesManagement.tsx`

**1. Yellow background on custom attribute rows**
- Replace the current `<TableRow key={attr.id}>` with a conditional className:
  ```
  <TableRow key={attr.id} className={attr.is_custom ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
  ```
- Keep the existing Custom badge in the Name cell for extra clarity.

**2. Add a filter toggle for Custom attributes**
- Add a state: `showCustomOnly: boolean` (default `false`)
- Add a filter button/toggle in the header area (next to the Add button) — a simple `Button` with variant toggle or a `Switch` labelled "Show Custom Only"
- Filter the `attributes` array before rendering: `const filtered = showCustomOnly ? attributes.filter(a => a.is_custom) : attributes`
- Display count: e.g. "Showing 3 custom / 12 total"

### Files to modify
- `src/pages/app/admin/AttributesManagement.tsx` only

