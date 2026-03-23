

## Add Custom Attribute Support

### Overview
Add a "Custom" toggle to the Attribute Dialog that unlocks free-text entry for data type and unit of measure. Custom attributes are stored in the same `master_attributes` table with an `is_custom` boolean flag and displayed with a yellow badge in the table.

### Database Change
Add `is_custom` column to `master_attributes` and relax the `data_type` CHECK constraint:

```sql
ALTER TABLE public.master_attributes ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.master_attributes DROP CONSTRAINT master_attributes_data_type_check;
-- No new constraint — custom types are free-text, standard ones validated in the UI
```

### Dialog Changes (`AttributeDialog.tsx`)

1. Add a **Custom** switch (shadcn Switch component) at the top of the form, next to the title
2. Add `is_custom` to `AttributeFormData`

**When Custom is OFF (default — current behaviour):**
- Data Type = dropdown from `DATA_TYPES` config (Decimal, Date, Alphanumeric, Julian Date)
- Unit of Measure = dropdown from matching `UNIT_OPTIONS`
- Validation Type = button group from config

**When Custom is ON:**
- Data Type = dropdown of existing types + "Other" option
  - If "Other" selected → show a text input for custom type name
  - If existing type selected → show its standard unit options + "Other" at the bottom
- Unit of Measure = standard dropdown (if existing type selected) with an **"Other"** option appended
  - If "Other" selected → show a text input for custom unit
  - If data type is fully custom ("Other") → just show a text input for unit (optional)
- Validation Type = standard options if existing type, otherwise defaults to "Single Value" with free-text option

### Table Changes (`AttributesManagement.tsx`)

- Yellow `Badge` on the Name column or a separate "Custom" badge when `is_custom === true`
- Tooltip: "Custom attribute — pending official addition to the system"
- Custom data types and units display their raw string values (since they won't match config labels)

### Form Data Flow
```text
is_custom: false → standard config-driven dropdowns (current behaviour)
is_custom: true  → existing type + "Other" for data type
                 → existing units + "Other" for unit of measure
                 → free-text inputs shown when "Other" selected
```

### Files to Modify
| File | Change |
|------|--------|
| Migration | Add `is_custom` column, drop CHECK constraint |
| `AttributeDialog.tsx` | Add Custom switch, "Other" options, conditional text inputs |
| `attributeConfig.ts` | No change needed — custom values bypass config lookup |
| `AttributesManagement.tsx` | Yellow badge for custom attributes, handle unknown data type/unit labels |

### Edge Cases
- Editing a custom attribute preserves `is_custom = true` and shows the custom fields pre-filled
- Export/import in the bulk service will carry through `is_custom` flag
- `getDataTypeConfig()` returning `undefined` for custom types is already handled (used with optional chaining throughout)

