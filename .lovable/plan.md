

## Add Feasibility Gaps Panel to Feasibility Gate Dialog

### Overview

When the Feasibility Gate dialog opens and the gate is not yet signed off, show a prominent "Gaps to Complete" panel at the top of the dialog (above the tabs) listing exactly which sections still need attention. This gives users an immediate, actionable checklist without needing to navigate back through each tab.

### What the User Will See

When feasibility is incomplete, a bordered amber/warning panel appears between the dialog header and the tabs:

```
 ! Gaps to Complete (3 remaining)
   - Overview: Missing site address, segment, project goals
   - Contacts: No contacts linked to this project
   - Factory: No factory groups configured
```

When all tabs are green but sign-off hasn't happened, the panel turns green with a tick:

```
 All sections complete -- ready for sign-off below
```

Once signed off, no panel is shown (the existing signed-off badge handles it).

### Gap Detail per Section

| Section | Green when | Gap messages when incomplete |
|---------|-----------|---------------------------|
| **Overview** | All key fields populated + 3 checkboxes ticked | Lists each missing field by name (e.g. "Missing site address", "Final scoping not confirmed") |
| **Contacts** | At least 1 contact linked | "No contacts linked to this project" |
| **Factory** | Portal URL set, every factory has shifts + groups, every group has lines | Specific message: "No portal URL", "Factory X has no shifts", "Group Y has no lines" |
| **Lines** | At least 1 solutions line exists | "No lines configured" |

### Technical Approach

**1. Pass completeness data to the dialog**

Currently `FeasibilityGateDialog` receives a single `allTabsGreen` boolean. We will add an optional `completeness` prop with the individual tab statuses:

```typescript
interface FeasibilityGateDialogProps {
  // ... existing props
  completeness?: {
    overview: boolean;
    contacts: boolean;
    factory: boolean;
    lines: boolean;
  };
}
```

Passed from `SolutionsProjectDetail.tsx` where `useTabCompleteness` already provides these values.

**2. Compute detailed gap messages inside the dialog**

The dialog already fetches all the data it needs in `fetchSummary`. After that fetch completes, compute a `gaps: string[]` array:

- Overview gaps: check the project fields (passed via a new `projectData` prop or inferred from summary)
- Contacts gap: if `completeness.contacts === false`, add message
- Factory gaps: use `summary.portal` and `summary.factories` to identify missing portal URL, empty groups, or missing lines
- Lines gap: if `summary.lineCount === 0`, add message

Store `gaps` in component state, computed after `fetchSummary` resolves.

**3. Render the gaps panel**

Above the `<Tabs>` component, render a conditionally-visible panel:
- If `signedOff` is true: hide the panel entirely
- If gaps exist: amber-bordered card with `AlertTriangle` icon, listing each gap as a bullet
- If no gaps (all green): green-bordered card with `CheckCircle2` icon and "Ready for sign-off" message

### Files to Change

| File | Change |
|------|--------|
| `src/components/FeasibilityGateDialog.tsx` | Add `completeness` and `projectData` props, compute gap messages from summary data, render gaps panel above tabs |
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | Pass `completeness` object and `project` data to `FeasibilityGateDialog` |

