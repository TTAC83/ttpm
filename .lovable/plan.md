

## Move Hardware Summary to Project Management Row

### Overview

Move the "Hardware Summary" tab from Row 1 (Feasibility Gate) to Row 2 (Project Management), remove its red/green completeness indicator, and stop it contributing to the Feasibility Gate calculation.

### Changes

**1. `src/pages/app/solutions/SolutionsProjectDetail.tsx`**

- Remove `completeness.hardwareSummary` from the `allTabsGreen` calculation (line 75)
- Move the "Hardware Summary" `TabsTrigger` from Row 1 to Row 2 (after "Calendar"), removing the red/green dot span
- The tab content (`TabsContent value="hardware-summary"`) remains unchanged

**2. `src/pages/app/solutions/hooks/useTabCompleteness.ts`**

- Remove `hardwareSummary` from the `TabCompleteness` interface
- Remove the `hardwareSummaryComplete` computation and its assignment in `setCompleteness`

### Result

- The Feasibility Gate badge will be driven only by: Overview, Contacts, Factory, and Lines
- "Hardware Summary" will appear as a plain tab in the Project Management row alongside Contract Info, Team, Account Info, WBS Gantt, etc.
- No indicator dot on the Hardware Summary tab

