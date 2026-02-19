

## Add SKU Count to Factory Configuration and Feasibility Gate

### What Changes

| File | Action |
|------|--------|
| `src/components/shared/FactoryConfigurationTab.tsx` | **Edit** -- Add SKU Count numeric input field to the form |
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | **Edit** -- Add `FactoryConfigurationTab` below `SolutionsFactoryConfig` in the Factory tab content |
| `src/pages/app/solutions/hooks/useTabCompleteness.ts` | **Edit** -- Add `factoryConfig` completeness check requiring `sow_sku_count` to be set |
| `src/components/FeasibilityGateDialog.tsx` | **Edit** -- Add `factoryConfig` to completeness interface and gaps panel |
| Database | **No migration** -- Reuse existing `sow_sku_count` column on `solutions_projects` |
| Database | **Data update** -- Reset feasibility sign-off for project `9a1c8fd7-0ef0-404b-a9ae-a29df3d71717` |

### Detail

**1. SKU Count field in FactoryConfigurationTab**

Add a numeric input labelled "SKU Count" to the Factory Configuration form. The field maps to the existing `sow_sku_count` column on `solutions_projects`. It will appear after Modules and Features. Required for completeness (must be > 0).

The component already queries by table name based on `type` prop, so it will work for Solutions without code changes to the query logic -- just need to add `sow_sku_count` to the select and update payloads. For Implementation/BAU projects this field will also appear but won't affect their workflows.

**2. Factory tab in Solutions**

Currently the Factory tab only renders `SolutionsFactoryConfig` (the portal/factory hierarchy). The `FactoryConfigurationTab` component will be added below it, giving the user access to the configuration fields including the new SKU Count.

**3. Completeness logic**

A new `factoryConfig` boolean will be added to `useTabCompleteness`. It checks that `sow_sku_count` is set and greater than 0. This will be combined into `allTabsGreen` in `SolutionsProjectDetail.tsx`.

A red/green dot will appear on the Factory tab trigger. The Factory tab dot will require BOTH the existing factory hierarchy completeness AND the new factoryConfig completeness to show green.

**4. Feasibility Gate gaps**

The `FeasibilityGateDialog` completeness interface will include `factoryConfig`. When incomplete, the gaps panel will show: "Factory Configuration: SKU Count is required".

**5. Feasibility reset**

After implementation, the feasibility sign-off for project `9a1c8fd7-0ef0-404b-a9ae-a29df3d71717` will be reset so you can re-test the full flow.

### Technical Notes

- Reusing `sow_sku_count` avoids data duplication -- this is the same SKU count referenced in the SOW document.
- The `FactoryConfigurationTab` component already supports `type='solutions'` and queries `solutions_projects` accordingly.
- The select query in `FactoryConfigurationTab` will be extended to include `sow_sku_count`.
- No new database columns or migrations are needed.

