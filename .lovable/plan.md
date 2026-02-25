

## Multi-Line Setup View -- UX Design and Implementation Plan

### The Problem

With 2-5 lines per project sharing similar configurations, the current wizard forces users through 4 steps x N lines, each time navigating the same 25+ field camera dialogs. There is no way to see lines side-by-side, clone configurations, or batch-enter structure.

### Recommended Approach: Accordion-Based Multi-Line Editor

A single scrollable page where **all lines appear as expandable cards**, each with collapsible sections that mirror the wizard steps. This gives users a birds-eye view of all lines while allowing drill-down into any field without modal dialogs or step-by-step constraints.

```text
┌─────────────────────────────────────────────────────────┐
│  Production Lines          [Wizard View] [Multi-Line ●] │
├─────────────────────────────────────────────────────────┤
│  + Add Line    + Bulk Add Lines    Clone ▾              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ Line 1: Packing Line A               ●●●○ 75%       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ▸ Basic Info     ▾ Process Flow    ▸ Titles      │    │
│  │ ▸ Devices                                       │    │
│  │                                                 │    │
│  │  [Process Flow section expanded inline]          │    │
│  │  ┌────────┐ → ┌────────┐ → ┌────────┐          │    │
│  │  │Infeed  │   │Inspect │   │Outfeed │          │    │
│  │  │2 equip │   │3 equip │   │1 equip │          │    │
│  │  └────────┘   └────────┘   └────────┘          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ▸ Line 2: Packing Line B               ●●○○ 50%       │
│  ▸ Line 3: Labelling Line               ○○○○ 0%        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key UX Features

**1. Toggle between views** -- A Switch/ToggleGroup at the top of the Lines tab. "Wizard View" keeps the current table + wizard. "Multi-Line" shows the new accordion editor. User preference persists via localStorage.

**2. Bulk Add Lines** -- A dialog where the user types multiple line names (one per row in a textarea), creating skeleton lines instantly. Reduces the "click Create, fill name, save, repeat" loop.

**3. Clone Line** -- Dropdown on each line card: "Clone to this project" duplicates all positions, equipment, cameras (with all 25+ fields), IoT devices, titles. Appends "(Copy)" to the name. This is the biggest time-saver for "somewhat similar" lines.

**4. Collapsible Sections per Line** -- Four sections matching wizard steps:
- **Basic Info**: Inline-editable fields (name, speeds, descriptions, product/artwork counts). Auto-save on blur, matching the existing Overview tab pattern.
- **Process Flow**: The existing ProcessFlowBuilder component embedded inline (positions + equipment).
- **Titles**: The existing EquipmentTitles component embedded inline.
- **Devices**: The existing DeviceAssignment component embedded inline. Camera detail opens the existing CameraConfigDialog -- no new camera UI needed.

**5. Completeness Indicator** -- Each line card shows its completeness percentage (reusing `lineCompletenessCheck.ts`), so users can see at a glance which lines need attention.

**6. Auto-save** -- Basic Info fields auto-save on blur. Process Flow, Titles, and Devices save via an explicit "Save Line" button per line (necessary because of the destructive delete-and-recreate pattern -- auto-saving nested structures would be risky).

### Technical Implementation

#### Files to Create

| File | Purpose |
|------|---------|
| `src/components/line-builder/MultiLineEditor.tsx` | Main component: renders all lines as accordion cards with collapsible sections, toggle, bulk-add, and clone |
| `src/components/line-builder/MultiLineCard.tsx` | Single line accordion card with 4 collapsible sections embedding existing step components |
| `src/components/line-builder/BulkAddLinesDialog.tsx` | Textarea dialog for adding multiple line names at once |
| `src/components/line-builder/hooks/useCloneLine.ts` | Hook to duplicate a line with all nested data (positions, equipment, cameras, IoT, titles) |

#### Files to Modify

| File | Change |
|------|--------|
| `src/components/line-builder/LinesTable.tsx` | Add toggle state (localStorage-backed). When "Multi-Line" is active, render `MultiLineEditor` instead of the table. Pass same props through. |
| `src/components/line-builder/steps/ProcessFlowBuilder.tsx` | No changes -- embedded as-is |
| `src/components/line-builder/steps/EquipmentTitles.tsx` | No changes -- embedded as-is |
| `src/components/line-builder/steps/DeviceAssignment.tsx` | No changes -- embedded as-is |

#### Data Flow

- `MultiLineEditor` fetches all lines for the project (same query as `LinesTable`)
- Each `MultiLineCard` manages its own `lineData` + `positions` state via `useLineWizard` (reusing the existing hook in "always open" mode)
- Clone uses `useCloneLine` which reads the source line's full data via `useLineData.loadData()`, then calls `useLineData.saveData()` with a new name
- Bulk Add creates minimal line records (name only) via direct Supabase insert, then refreshes the list

#### Save Strategy

Each line card has a "Save" button that calls the existing `handleComplete` from `useLineWizard`. This reuses the exact same save path (including the `non-standard` UUID sanitisation), avoiding any new save logic. A dirty-state indicator (unsaved changes dot) warns the user before navigating away.

### What This Does NOT Change

- The existing wizard remains fully functional behind the toggle
- No database schema changes
- No new API endpoints
- All existing completeness checks continue to work
- The destructive save pattern is unchanged (same risk profile as today)

