
## Move "Factory Hardware" Tab to Feasibility Gate Row

A simple restructuring of the tab navigation: move the "Factory Hardware" tab trigger from Row 3 (Technical) to Row 1 (Feasibility Gate), positioned between "Lines" and "Hardware Summary".

### What Changes

**File: `src/pages/app/solutions/SolutionsProjectDetail.tsx`**

1. Remove `<TabsTrigger value="hardware">Factory Hardware</TabsTrigger>` from the Technical row (Row 3, currently line 320).
2. Insert it into the Feasibility Gate row (Row 1), directly after the "Lines" trigger and before "Hardware Summary" -- i.e. between lines 286 and 287.
3. The Factory Hardware tab will **not** have a red/green completeness dot -- it will appear as a plain tab trigger, consistent with how it currently looks. It will also **not** affect the Feasibility Gate badge colour calculation.

No other files or logic changes are required.
