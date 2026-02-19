

## Fix: Connect Line Completeness (including Camera Placement) to Feasibility Flow

### The Problem

The `useTabCompleteness` hook determines whether the "Lines" tab shows a green or red dot, and whether the Feasibility Gate badge turns green. Currently, the lines check on line 135 of `useTabCompleteness.ts` is:

```
const linesComplete = (linesRes.count ?? 0) > 0;
```

This only checks whether at least one solutions line exists. It does not evaluate whether each line is fully configured -- meaning Camera Placement gaps (and all other per-line configuration gaps) are ignored by the feasibility flow.

Meanwhile, the detailed `useLineCompleteness` hook correctly checks all camera fields including the new placement fields, but its results are only used to render the "Configuration Gaps" table on the Lines tab. They never flow back into the tab-level completeness indicator or the Feasibility Gate.

### The Fix

Update `useTabCompleteness.ts` so that the `lines` completeness check calls the same logic used by `useLineCompleteness` -- specifically, it must verify that **every** solutions line has 100% completeness (including Camera Placement fields).

### Implementation

**File: `src/pages/app/solutions/hooks/useTabCompleteness.ts`**

Replace the simple `linesComplete` check (line 135) with a call that:

1. Fetches all solutions lines for the project (already done via `linesRes`)
2. If lines exist, calls the `checkAllLines` logic from `useLineCompleteness` (or a shared utility) to get the percentage for each line
3. Sets `linesComplete = true` only when **every line has percentage === 100**

Since `useLineCompleteness` is a React hook and cannot be called inside `useTabCompleteness` directly, the approach will be to:

- Extract the core completeness-checking logic from `useLineCompleteness` into a standalone async function (e.g., `checkLineCompleteness(lineId, solutionsProjectId)`) that can be imported by both hooks
- Call this function from `useTabCompleteness` for each line
- Keep `useLineCompleteness` as a thin wrapper that calls the same extracted function

**Detailed steps:**

1. Create a new utility function in `src/pages/app/solutions/hooks/lineCompletenessCheck.ts` that contains the core async logic currently in `useLineCompleteness.checkLine()` and `getSolutionTypeMap()`
2. Update `useLineCompleteness.ts` to import and delegate to this shared function (no behavior change)
3. Update `useTabCompleteness.ts` to import the shared function and use it for the `lines` completeness check instead of the simple count check

### Files to Change

| File | Change |
|------|--------|
| `src/pages/app/solutions/hooks/lineCompletenessCheck.ts` | New file -- extract core `checkLine()` and `getSolutionTypeMap()` logic |
| `src/pages/app/solutions/hooks/useLineCompleteness.ts` | Refactor to delegate to the shared utility |
| `src/pages/app/solutions/hooks/useTabCompleteness.ts` | Replace `linesComplete = count > 0` with actual per-line completeness evaluation |

### Impact

- The green/red dot next to "Lines" in the nav will now correctly reflect whether all lines (including all camera placement fields) are fully configured
- The Feasibility Gate badge will only turn green when lines are truly complete
- The Feasibility Gate sign-off button will only become available when all placement confirmations and position descriptions are filled
- No change to the user-facing "Configuration Gaps" table -- it will continue to work as before

