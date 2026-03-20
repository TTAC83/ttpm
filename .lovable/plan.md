

## Add Equipment Selection to Product Views

### Context
- Products are linked to lines via `product_line_links` (product_id → line_id)
- Lines have positions, which have equipment
- A `product_view_equipment` join table already exists in the database (columns: `id`, `product_view_id`, `equipment_id`) — it just needs UI wiring
- The user wants views to select equipment from only the lines the parent product is attached to

### No Database Changes Needed
The `product_view_equipment` table is already in place with the correct FKs.

### Changes

**Modify: `src/components/products/ProductViewDialog.tsx`**
1. Add state for available equipment and selected equipment IDs
2. On dialog open, fetch the parent product's linked line IDs from `product_line_links`
3. Query `positions` → `equipment` for those lines (using `solutions_line_id` since these are solutions projects) to build a grouped equipment list
4. Display a multi-select checkbox list grouped by line → position → equipment name
5. On save, sync `product_view_equipment` (delete existing + insert selected)
6. On edit, load existing `product_view_equipment` records to pre-check selections

### UI Layout
Below the Vision Project selector and above the Attributes section:
- **Equipment** label with helper text
- Grouped checklist: Line Name → Position Name → Equipment Name (checkbox)
- Only shows equipment from lines the product is linked to

### Data Flow
```text
product_line_links (product → lines)
  → positions (where solutions_line_id = line.id)
    → equipment (where position_id = position.id)
      → product_view_equipment (selected equipment for this view)
```

### Fix Build Error
Will also add a trivial edit to `src/main.tsx` to force a clean rebuild and clear the duplicate `data-lov-id` tagger issue.

