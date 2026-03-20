
## Fix Product View Linking for Positions and Equipment

### Root cause
The current Product View equipment loading logic is using the wrong line IDs.

```text
product_line_links.line_id -> references factory_group_lines.id
NOT solutions_lines.id
```

But `ProductViewDialog` currently does this:

```text
product_line_links.line_id
-> query solutions_lines where id in (lineIds)
-> query positions where solutions_line_id in (lineIds)
```

That fails because the linked IDs are factory line IDs, not solutions line IDs. The network logs confirm this:
- `product_line_links.line_id = 7e086bd3...`
- matching `solutions_lines.id` is actually `1a2d7338...`
- current `solutions_lines?id=in.(7e086bd3...)` returns empty
- therefore positions/equipment are empty

### What to change

#### 1) Fix line resolution in `src/components/products/ProductViewDialog.tsx`
Update the fetch flow to:

```text
product_line_links
-> factory_group_lines (get linked line names)
-> solutions_lines for this solutions project, matched by line_name
-> positions where solutions_line_id in matched solutions line ids
-> equipment where position_id in matched position ids
```

This aligns with how products are currently linked at product level and with the project’s solutions-line architecture.

### 2) Add position linking as well, not just equipment
There is already a `product_view_positions` table in the schema, but the dialog is not using it.

Update the dialog to:
- fetch available positions from the resolved solutions lines
- allow selecting positions for the view
- keep equipment filtered under those resolved positions
- load existing `product_view_positions` on edit
- save `product_view_positions` together with `product_view_equipment`

### 3) Recommended UI structure
In `ProductViewDialog`:
- show a **Positions** section first
- show an **Equipment** section second
- group both by line
- optionally nest equipment under position labels for clarity

Example:

```text
Line T1
  [ ] Position A
      [ ] Camera 1
      [ ] Camera 2
  [ ] Position B
      [ ] Sensor 1
```

### 4) Save behavior
On save:
- sync `product_view_positions` with delete + insert
- sync `product_view_equipment` with delete + insert

Optional safeguard:
- if equipment is selected, auto-insert its parent position into `product_view_positions`
- or validate that selected equipment must belong to a selected position

### 5) Editing behavior
When opening an existing view:
- load current `product_view_positions`
- load current `product_view_equipment`
- pre-check both in the UI

### 6) Why this is the right fix
This follows the existing data model:
- product-level line links are to `factory_group_lines`
- solutions build data lives under `solutions_lines`
- positions in solutions context must be queried via `positions.solutions_line_id`
- equipment is linked from positions

So the missing link is the name-based bridge:
```text
factory_group_lines.name <-> solutions_lines.line_name
```

### Files to modify
- `src/components/products/ProductViewDialog.tsx`

### Implementation summary
1. Replace the broken direct `product_line_links -> solutions_lines by id` query
2. Resolve linked factory lines to solutions lines by name within the current project
3. Fetch positions from those resolved solutions lines
4. Fetch equipment from those positions
5. Add UI + state for selected positions
6. Persist `product_view_positions` and `product_view_equipment`

### Technical note
This is consistent with the project’s gradual migration pattern: product links remain tied to factory hierarchy, while downstream operational data uses `solutions_lines` and `positions.solutions_line_id`. No database change is needed for this fix.

### Expected result
After this change, views will be able to:
- see positions from the product’s linked lines
- see equipment under those positions
- save linked positions and equipment correctly
- reopen with those selections preserved
