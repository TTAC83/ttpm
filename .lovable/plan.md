
# GOSPA Presentation Home Page — Visual Hierarchy Tree

## What you'll get

The current presentation home page (a centered title card with an objectives grid) will be replaced with a **visual management board** — an interactive, horizontally-flowing hierarchy tree that reveals the full GOSPA structure at a glance:

```text
                    +--[ Strategy A ]--[ Plan 1 ]--[ Action x ]
  [ Objective 1 ]---|                  [ Plan 2 ]--[ Action y ]
                    +--[ Strategy B ]--[ Plan 3 ]
                                                    
[ GOAL ]---[ Objective 2 ]--[ Strategy C ]--[ Plan 4 ]--[ Action z ]
                                                    
  [ Objective 3 ]--[ Strategy D ]
```

Each node is a styled card with:
- **Goal**: Large hero card, Thingtrax green accent, title + description + dates
- **Objectives**: RAG-status colored left border, title, click to navigate
- **Strategies**: Compact cards with status pill and RAG dot
- **Plans**: Smaller cards with date range
- **Actions**: Micro-cards with status indicator dot

Connecting lines drawn between tiers using CSS pseudo-elements (no SVG library needed).

Clicking **any node** navigates into the presentation detail view for that element (objective view, strategy detail, etc.).

## Design approach

**Layout**: A horizontal tree flowing left-to-right, scrollable. The Goal sits at the left as an anchor. Each tier indents further right. Vertical stacking within each tier handles multiple siblings. On smaller widths, the tree scrolls horizontally.

**Visual language**: 
- Dark background (thingtrax-black) consistent with presentation mode
- Thingtrax green connecting lines and accents
- Glassmorphic cards (bg-white/5, border-white/10, backdrop blur)
- RAG status indicators on objectives and strategies
- Subtle hover glow on interactive cards
- Status dots (green/blue/amber/red) on actions

**Interaction**: 
- Click any objective card -> navigates to objective view (existing)
- Click any strategy/plan/action -> navigates to a new detail view for that element
- The left navigation panel stays visible with the existing Home/Back/Objectives buttons

## Technical changes

### 1. `src/components/gospa/PresentGospaDialog.tsx`

**Data fetching** — The dialog already receives `objectives` and fetches questions/entries. Add fetching for strategies, plans, and actions (the Dashboard already fetches these, so we'll pass them as props instead of re-fetching):

- Add `strategies`, `plans`, `actions` to the `Props` interface
- Add new ViewState types: `{ type: "strategy"; ... }`, `{ type: "plan"; ... }`, `{ type: "action"; ... }`

**HomeView replacement** — Replace the current centered title + grid with a `GospaTreeView` component that renders the full hierarchy as an interactive horizontal tree.

**New detail views** — Add `StrategyDetailView`, `PlanDetailView`, and `ActionDetailView` sub-components for when users click deeper nodes.

### 2. `src/pages/app/gospa/Dashboard.tsx`

Pass the already-fetched `stratsQ.data`, `plansQ.data`, and `actionsQ.data` to `PresentGospaDialog` as new props.

### 3. Tree rendering approach

The tree uses a nested flex layout (no external library):
- Outer container: `flex items-start gap-8` (horizontal flow)
- Each tier column: `flex flex-col gap-3` with connector lines via CSS borders
- Connecting lines: Horizontal + vertical CSS pseudo-elements using `before/after` with `border-left` and `border-top` in thingtrax-green

This keeps it pure CSS/Tailwind with no dependency additions.
