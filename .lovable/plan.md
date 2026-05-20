
## Goal

Each tab dot already turns red/green. Add a clear, scannable list of **what's missing** so users know exactly what to fill in to make a tab green — without leaving the tab they're on.

## How it works today (and why it needs a small refactor)

`useTabCompleteness` returns only booleans (`overview: true/false`, `team: true/false`, etc.). To show "what's missing" we need the *reasons*, not just the result. Right now every reason is hidden inside the hook's `if (...)` checks.

### Refactor: return reasons alongside booleans

Change the hook's return shape from:

```ts
{ overview: boolean, team: boolean, ... }
```

to:

```ts
{
  overview: { complete: boolean, missing: MissingItem[] },
  team:     { complete: boolean, missing: MissingItem[] },
  ...
}

type MissingItem = {
  key: string;          // e.g. 'product_description'
  label: string;        // e.g. 'Product Description'
  tab?: string;         // for cross-tab items (e.g. Hardware → "Cameras unassigned to servers")
  count?: number;       // e.g. "3 cameras unassigned"
};
```

The existing checks (e.g. `overview` requires 8 fields, `team` requires 12 roles, `contract` requires 11 fields + conditional break-clause / deviation, `infrastructure` requires 11 fields, hardware checks for unassigned cameras/devices/receivers, etc.) get rewritten to **push a `MissingItem` per failing condition** instead of short-circuiting to `false`. `complete` is just `missing.length === 0`.

This is a single-file change in `useTabCompleteness.ts`. All call sites (`SolutionsProjectDetail.tsx` lines 154, 320–377, 576–582 and the Feasibility/Launch gate dialogs) need a one-line update: `completeness.overview` → `completeness.overview.complete`.

### Reactivity (frontend efficiency)

The hook already re-runs via the `refreshKey` pattern whenever a field saves (Overview uses Always-Editable auto-save on blur per project memory). Returning reasons doesn't change query count or shape — it just keeps the strings that were already being computed. No extra Supabase round-trips, no extra renders. The async block still batches with `Promise.all` as it does now.

## UX: where the missing list appears

Three coordinated touch points, in order of priority:

### 1. In-tab "Missing info" banner (primary)

At the top of each tab's content area, render a dismissable-looking banner **only when that tab is red**:

```text
┌──────────────────────────────────────────────────────┐
│ ⚠ Missing info — 3 fields needed to complete         │
│   • Product Description                              │
│   • Segment                                          │
│   • Site Address                                     │
└──────────────────────────────────────────────────────┘
```

- Uses existing `Alert` shadcn component, `variant="destructive"` styling but softened (light red bg, red border, red icon, dark text) so it doesn't feel like an error.
- Each item is a `<button>` that scrolls to + focuses the corresponding field (use `scrollIntoView({ block: 'center' })` + `field.focus()`). Field components get a `data-field="product_description"` attribute so the banner can find them.
- Banner auto-disappears the moment `missing.length === 0` (already reactive via the hook).

This is the main interaction — users see the list right where they'll fix it.

### 2. Tab-dot tooltip (secondary, for navigation)

Wrap the existing red dot in the `TabsTrigger` with a `Tooltip` (already imported in `SolutionsProjectDetail.tsx`). On hover:

```text
3 fields missing:
  • Product Description
  • Segment
  • Site Address
```

Lets users see what's missing on *other* tabs without clicking through. Zero extra data — uses the same `completeness.overview.missing` array.

### 3. Top-level "Project readiness" summary (optional, low effort)

The header already has a Feasibility Gate dialog. The dialog can list missing items grouped by tab so a Sales Consultant can see the full picture before sign-off. Same data source.

## Why this design

- **Surface where users act.** Putting the list inside the tab (#1) means the fix is one click away. A tooltip-only solution forces hover-hunting.
- **Single source of truth.** All three surfaces read from the same `completeness` object — no duplication, no drift.
- **Costs nothing extra.** The hook already computes every condition; we just stop throwing the reason away.
- **Respects "Always Editable" pattern.** No modals, no edit-mode toggle — banner shrinks as the user types and blurs.
- **Accessible.** Banner is a real list with real buttons; tooltip is keyboard-focusable; field focus moves on click.

## Things to watch / reasons not to over-build

- **Don't add inline red borders on every empty field.** The project deliberately avoids "form validation noise" — the banner + tab dot is enough signal. Inline red would clash with Always-Editable.
- **Don't show counts in the tab label** (e.g. "Overview (3)"). Tab labels stay clean; the dot + tooltip handle status.
- **Hardware tab is special.** Its "missing" items aren't fields, they're relationships ("2 cameras unassigned to a server"). The banner needs to handle counted items, and clicking should scroll to the unassigned row, not a field. Implementation uses the same `MissingItem` shape with `count` populated.
- **Conditional fields.** Contract's break-clause sub-fields and deviation-of-terms only appear in `missing` when their parent toggle is on — already how the hook works, just preserve it.
- **Async lag.** The async block (factory/lines/hardware) lands ~200–500ms after sync fields. Banner should render sync items immediately and async items when they arrive — no spinner needed, the list just grows/shrinks.

## Files touched

- `src/pages/app/solutions/hooks/useTabCompleteness.ts` — return `{ complete, missing }` per tab.
- `src/pages/app/solutions/SolutionsProjectDetail.tsx` — update completeness reads, add `Tooltip` around each tab dot.
- New: `src/components/shared/MissingInfoBanner.tsx` — reusable banner, takes `missing: MissingItem[]`.
- Each tab component (`OverviewTab`, `TeamTab`, `ContractInformationTab`, `SolutionsInfrastructure`, `SolutionsHardwareSummary`, etc.) — render `<MissingInfoBanner items={completeness.X.missing} />` at the top and add `data-field` attributes to inputs.
- `FeasibilityGateDialog` — optional: render the same banner grouped by tab.

## Out of scope

- Changing what counts as "complete" for any tab (the rules stay identical).
- Validation on save / blocking submits.
- Inline per-field error states.
- BAU and Implementation project completeness (this hook is solutions-only — same pattern can be applied later).
