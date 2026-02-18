

## Rename "Line Description" and Remove Three Checkboxes

### Overview

Two changes:
1. Rename the label "Line Description" to "Process Description" everywhere it appears in the UI
2. Remove the three checkboxes (Final Scoping Complete, Contract Signed, Implementation Handover) from the Overview page and all places they feed into across the app

### Changes

**1. Rename "Line Description" to "Process Description"**

| File | Change |
|------|--------|
| `src/components/shared/OverviewTab.tsx` (line 287) | Change label from "Line Description" to "Process Description" |
| `src/components/line-builder/steps/LineBasicInfo.tsx` (line 95) | Change label from "Line Description" to "Process Description" |

The underlying database column (`line_description`) stays the same -- only the display label changes.

**2. Remove the three checkboxes from OverviewTab**

| File | Change |
|------|--------|
| `src/components/shared/OverviewTab.tsx` (lines 253-283) | Remove the `{type === 'solutions' && ...}` block containing the three Switch toggles for `final_scoping_complete`, `contract_signed`, and `implementation_handover` |

**3. Remove checkbox indicators from Solutions list and detail pages**

| File | Change |
|------|--------|
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | Remove the three circular icon indicators (green/grey) for Final Scoping, Contract Signed, and Implementation Handover from the project header area |
| `src/pages/app/solutions/SolutionsList.tsx` | Remove the three circular icon indicators from each project card in the list view |

**4. Remove from completeness / feasibility logic**

| File | Change |
|------|--------|
| `src/pages/app/solutions/hooks/useTabCompleteness.ts` (lines 57-59) | Remove `final_scoping_complete`, `contract_signed`, and `implementation_handover` from the overview completeness check. Overview will be green based on the remaining fields only |
| `src/components/FeasibilityGateDialog.tsx` (lines 455-457) | Remove the three gap messages ("final scoping not confirmed", "contract not signed", "implementation not handed over") from the gaps panel |

### What stays

- The database columns remain untouched (no migration needed)
- The `formData` properties can be cleaned up from `buildFormData` in OverviewTab since they are no longer rendered, but the columns will simply be unused
- The field `line_description` in the database keeps its name; only the UI label changes

