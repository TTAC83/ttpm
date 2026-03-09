

## Plan: Restore Line Completion Percentages & Add Configuration Gaps Table

### Root Cause

The `useTabCompleteness` hook (used on the Solutions project detail page) queries `product_gaps` with `.is('resolved_at', null)` on line 154 — but that column does not exist. The column is actually called `closed_at`. This causes the entire `Promise.all` in the async check to fail silently, which means:
- The `lines` tab completeness dot never updates
- Other tab dots (contacts, factory, feature requirements, etc.) also never update
- The unhandled rejection may cause rendering issues that affect the inline percentage badges in the Lines tab

### Changes

**1. Fix `useTabCompleteness.ts` — replace `resolved_at` with correct column**

Change line 154 from `.is('resolved_at', null)` to `.is('closed_at', null)` so the product gaps query succeeds and the entire async completeness check completes normally.

**2. Add error handling to `useTabCompleteness.ts`**

Wrap the `checkAsync` call in a try-catch so that if any individual check fails, it doesn't silently break all other checks.

**3. Add a consolidated Configuration Gaps summary table to the Lines tab**

Add a summary card at the top of the `SolutionsLines.tsx` table view that aggregates all line gaps into a single table (similar to `FactoryConfigGaps`). This table will show:
- Line name
- Category (e.g., "Line Information", "Positions & Equipment", "Camera config")
- Issue description
- Total items remaining per line

The table will appear when `showGaps` is toggled on and any line has gaps. It provides a single-glance view of all configuration gaps across all lines, complementing the existing per-line expandable gaps.

### Technical Details

| File | Change |
|------|--------|
| `src/pages/app/solutions/hooks/useTabCompleteness.ts` | Fix `resolved_at` → `closed_at`; add try-catch |
| `src/pages/app/solutions/tabs/SolutionsLines.tsx` | Add consolidated gaps summary table above the lines table |

