
# Add Gantt View to GOSPA Presentation Home Page

## What you'll get

A toggle on the presentation home page that lets you switch between the existing **Tree View** and a new **Gantt View**. The Gantt view will display Plans and Actions as horizontal bars on a timeline, styled consistently with the dark presentation theme.

## Design

- Two toggle buttons at the top of the home page: **Tree View** (current default) and **Gantt View**
- The Gantt view reuses the existing `GospaGanttChart` component's rendering logic (sidebar + SVG timeline) but:
  - Filtered to show only Plans and Actions (not Goals/Objectives/Strategies)
  - Styled with the dark presentation theme (dark backgrounds, light text)
  - Built inline within the presentation dialog to avoid prop-drilling issues
- Plans shown as parent rows with their child Actions nested underneath
- Collapsible plan rows, zoom controls, and a "Today" scroll button included
- Clicking a bar navigates to the corresponding Plan or Action detail view within the presentation

## Technical changes

### `src/components/gospa/PresentGospaDialog.tsx`

1. Add a `homeTab` state (`"tree" | "gantt"`) to `GospaTreeView`
2. Add toggle buttons (Tree / Gantt) next to the existing Expand All button
3. Build an inline `PresentationGanttView` sub-component that:
   - Takes the `plans` and `actions` props
   - Builds timeline rows from plans (parent) and actions (children) with dates
   - Renders an SVG-based Gantt chart with sidebar, date headers, and bars
   - Uses the dark presentation styling (`bg-white/5`, `text-white/70`, etc.)
   - Reuses the `dateToX`, date marker, and month band logic from `src/features/gospa-gantt/buildTimeline.ts`
   - Supports zoom in/out, scroll to today, and expand/collapse
   - Clicking a bar calls `onNavigate` to open the plan or action detail view

No new files needed. No new dependencies.
