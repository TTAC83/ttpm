

## Redesign the Feasibility Gate Navigation Header

The current "Feasibility Gate" label is a standalone `<p>` tag sitting above the `TabsList`, making it look detached and misaligned. The fix is to integrate the label **inline** with the tab row, styled as a clean left-aligned badge/label that sits on the same horizontal line as the tabs.

### Design Approach

Replace the stacked layout with a single row where the "Feasibility Gate" label appears as a compact, left-aligned badge directly inside the `TabsList`, acting as a visual anchor before the tab triggers. The label will use a filled background (green or red) with white text, giving it a polished, purposeful look -- similar to how UK enterprise dashboards use inline "gate" labels in stage-gate processes.

The same pattern will be applied to **Row 2** ("Project Management") and **Row 3** ("Technical") so all three rows have a consistent, professional structure.

### Visual Result

Each row will look like:

```text
[FEASIBILITY GATE] [Customer Overview .] [Contacts .] [Factory .] [Lines .] [Hardware Summary .] [Feature Requirements .]
[PROJECT MANAGEMENT] [Contract Info] [Team] [Account Info] [WBS Gantt] [Gantt (Beta)] [Actions] [Calendar]
[TECHNICAL]          [Factory Hardware] [Vision Models] [Escalations] [Audit]
```

The gate label uses a small rounded badge with `bg-green-600 text-white` when all items are green, or `bg-red-600 text-white` when any are red. Row 2 and 3 labels use a neutral `bg-muted-foreground/20` style since they have no completeness tracking.

### Technical Changes

**File: `src/pages/app/solutions/SolutionsProjectDetail.tsx`**

1. Remove the `<div className="space-y-1">` wrapper and the standalone `<p>` tag for "Feasibility Gate".
2. Insert a non-interactive `<span>` badge as the first child inside the Row 1 `<TabsList>`, styled with conditional green/red background, white text, uppercase, small font, and rounded corners.
3. Add similar neutral label badges to Row 2 ("Project Management") and Row 3 ("Technical") for consistency.
4. Remove the IIFE wrapper `{(() => { ... })()}` since we can compute `allGreen` above the JSX return and reference it inline.

