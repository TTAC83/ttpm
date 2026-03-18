

## Changes to Attribute Dialog

### What changes

1. **Remove default value field** — delete the "Default Value (optional)" input (lines 299-310) and remove `default_value` from `AttributeFormData`.

2. **Remove min/max date pickers** — when "Apply Min/Max Date Validation" is ticked, instead of showing editable date inputs, show an **info panel** (light blue background, info icon) explaining the system-defined rules:
   - Minimum Allowed Date: Current System Date + 1 day
   - Maximum Allowed Date: Date imported from ERP system
   - Note that these are system-defined and non-configurable
   - Example line showing today's date context

3. **Keep the checkbox toggle** — "Apply Min/Max Date Validation" stays, but ticking it shows the info panel instead of date fields.

### Files to change

| File | Change |
|------|--------|
| `src/components/attributes/AttributeDialog.tsx` | Remove default_value field, remove min/max date inputs, replace with info panel when checkbox is ticked, remove `default_value`/`min_value`/`max_value` from form data |
| `src/components/attributes/attributeConfig.ts` | No changes needed |
| `src/pages/app/admin/AttributesManagement.tsx` | Remove default_value from table display if shown |

