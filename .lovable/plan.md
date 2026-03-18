

## Revised Plan: Attributes Tab — Vision/Hybrid Only

### Change Summary
The Attributes tab should only appear and be required for Feasibility Gate completeness when the project domain is **Vision** or **Hybrid**. For **IoT**-only projects, the tab is hidden and does not block sign-off.

### Files to Change

**1. `src/pages/app/solutions/SolutionsProjectDetail.tsx`**
- Conditionally render the Attributes `TabsTrigger` and `TabsContent` only when `project.domain === 'Vision' || project.domain === 'Hybrid'`.
- Update `allTabsGreen` to only require `completeness.attributes` when domain is Vision/Hybrid.
- Update the `completeness` prop passed to `FeasibilityGateDialog` similarly.

**2. `src/pages/app/solutions/hooks/useTabCompleteness.ts`**
- Add `attributes: boolean` to the `TabCompleteness` interface.
- Add `domain` awareness: for Vision/Hybrid, query `project_attributes` count > 0. For IoT, default `attributes` to `true`.

**3. `src/components/attributes/ProjectAttributesTab.tsx`** (new file, as per approved plan)
- No change from the approved plan — the conditional visibility is handled at the parent level.

**4. `src/pages/app/admin/AttributesManagement.tsx`**
- Add "Projects Using" count column — no change from approved plan.

**5. `src/components/FeasibilityGateDialog.tsx`**
- Add optional `attributes` key to the completeness prop; only show it in the checklist when present (i.e., Vision/Hybrid projects pass it, IoT projects omit it).

### Logic
- `project.domain` is already available on the project object
- Domain values are: `'Vision'`, `'IoT'`, `'Hybrid'`
- `const isVisionOrHybrid = project.domain === 'Vision' || project.domain === 'Hybrid'`
- In `allTabsGreen`: `(!isVisionOrHybrid || completeness.attributes)`

