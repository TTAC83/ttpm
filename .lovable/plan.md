

## Product-Level Attribute Selection with Set/Variable Values

### Problem
Currently, all vision project attributes flow down to every product view. The user needs to:
1. Select which attributes apply to each **product** (not all apply)
2. Mark each as **Set** (fixed value entered once on the product) or **Variable** (value differs per view)
3. If Set, enter the value at the product level; if Variable, values continue to be entered per view

### Current Data Flow
```text
master_attributes → project_attributes → vision_project_attributes → product_view_attributes (values)
```

### Proposed Data Flow
```text
master_attributes → project_attributes → vision_project_attributes
                                                    ↓
                                          product_attributes (select which, set/variable, fixed value)
                                                    ↓
                                          product_view_attributes (values only for "variable" attrs)
```

### Database Change

**New table: `product_attributes`**
- `id` UUID PK
- `product_id` UUID FK → products
- `project_attribute_id` UUID FK → project_attributes
- `is_variable` boolean default false
- `fixed_value` text nullable (used when is_variable = false)
- `created_at` / `updated_at` timestamps
- Unique constraint on (product_id, project_attribute_id)
- RLS: internal users full access (matching existing patterns)

### UI Changes

**Modify: `src/components/products/ProductDialog.tsx`**
- Add an "Attributes" section below existing fields
- Fetch available project attributes (from the project's linked vision project attributes)
- Show checkboxes to select which attributes apply to this product
- For each selected attribute, show a toggle: Set / Variable
- If Set, show a text input for the fixed value
- Save to `product_attributes` table on submit

**Modify: `src/components/products/ProductViewDialog.tsx`**
- When loading view attributes, filter to only show attributes marked as "variable" on the parent product
- Pre-populate "set" attribute values from `product_attributes.fixed_value` (read-only display)

### Technical Details

- The ProductDialog already receives `projectId` context — we'll use it to look up `project_attributes` → `master_attributes` for available attributes
- Need to fetch the product's vision project link to know which attributes are available (via `vision_project_attributes`)
- Products can be linked to multiple lines/groups, so attributes come from the project level, not the line level

### Scope
- 1 new migration (table + RLS)
- ~60 lines added to ProductDialog for the attributes section
- ~20 lines changed in ProductViewDialog to filter variable-only attributes

