

## Fix Attribute Logic: Product → View Flow

### Current (Wrong) Flow
- **Product level**: Select attributes, mark Set/Variable, enter fixed values for Set
- **View level**: Show variable attrs for value entry, display set values read-only

### Desired Flow
- **Product level**: Just select which attributes apply to this product (checkboxes only, no values)
- **View level**: Select a subset of the product's attributes, mark each as **Set** or **Variable**. If Set → enter value. If Variable → no value needed.

### Database Changes

**Modify `product_attributes` table:**
- Remove `is_variable` and `fixed_value` columns (no longer needed at product level — it's just a selection)

**Modify `product_view_attributes` table:**
- Add `is_variable` boolean column (default true)
- Make `value` nullable (variable attributes won't have a value)

### UI Changes

**`ProductDialog.tsx`** — Simplify attributes section:
- Remove Set/Variable toggle and fixed value input
- Keep only checkboxes to select which attributes apply to this product
- Remove `ProductAttributeData.is_variable` and `fixed_value` from the interface
- Remove `ProductAttributeState.is_variable` and `fixed_value`

**`ProductViewDialog.tsx`** — Move Set/Variable logic here:
- Show only attributes that are selected on the parent product (from `product_attributes`)
- For each, allow user to pick a subset (checkbox) and mark as Set or Variable
- If Set: show value input. If Variable: no input needed.
- Save `is_variable` and `value` (only for Set) to `product_view_attributes`

**`SolutionsProducts.tsx`** — Update `handleSubmit` to stop syncing `is_variable`/`fixed_value`

### Files Modified
| File | Change |
|------|--------|
| Migration SQL | Drop `is_variable`/`fixed_value` from `product_attributes`, add `is_variable` to `product_view_attributes`, make `value` nullable |
| `src/components/products/ProductDialog.tsx` | Simplify to checkbox-only attribute selection |
| `src/components/products/ProductViewDialog.tsx` | Add attribute subset selection with Set/Variable toggle and value input for Set |
| `src/pages/app/solutions/tabs/SolutionsProducts.tsx` | Simplify attribute sync in handleSubmit |

