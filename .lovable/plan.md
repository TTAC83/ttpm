

## Root Causes: Inaccurate Configuration Gaps

After analysing the data flow, there are **three bugs** causing stale or inaccurate configuration gaps:

### Bug 1: Stale data when switching between Multi-Line and Table views

When the user works in Multi-Line mode (saves process flow, cameras, etc.), then switches back to Table view, the `SolutionsLines` component still holds the original `lines` array from the initial page load. The `useLineCompleteness` hook only re-fires when `lines` changes — but `lines` never updates because `fetchLines()` is only called once on mount (`useEffect` at line 176). The completeness results (and therefore the gaps panel) reflect the state of the data at page load, not after the user's edits.

**Fix**: Call `fetchLines()` when `viewMode` changes back to `"wizard"`, so the table view always has fresh data from the database.

**File**: `src/pages/app/solutions/tabs/SolutionsLines.tsx`
- Add `viewMode` to the `useEffect` dependency that calls `fetchLines`, or add a separate effect that re-fetches when switching to wizard mode.

---

### Bug 2: MultiLineEditor saves don't trigger parent completeness refresh

When the user saves a line in MultiLineEditor, the `onSaved` callback in `MultiLineEditor` only calls its own internal `fetchLines()`. The parent `SolutionsLines` component's `lines` state and `completenessResults` are never updated. Even the `MultiLineEditor`'s own completeness computation may show stale percentages because it recomputes based on its own `lines` state, which updates — but there is a timing issue: the completeness check runs an RPC call against the database immediately after save, and the RPC may return before all child table inserts (cameras, attributes, etc.) have committed.

**Fix**: No change needed for MultiLineEditor's internal completeness (it already re-fetches). The fix from Bug 1 covers the table-view staleness.

---

### Bug 3: Completeness check treats `0` as "missing" for speed fields

In `lineCompletenessCheck.ts` line 83-89:
```js
if (value && value !== 0) {
  passedChecks++;
} else {
  lineInfoGaps.push(label);
}
```
The condition `value && value !== 0` short-circuits when `value` is `0` (since `0` is falsy in JavaScript). This means `Min Speed = 0` and `Max Speed = 0` are always flagged as gaps, even if the user intentionally set them. While 0 might be a reasonable "not set" sentinel for speeds, the same logic applies to `Number of Products` and `Number of Artworks`, where 0 could be valid. More importantly, newly created lines default to `min_speed: 0, max_speed: 0`, so they always show these as gaps even though the user hasn't had a chance to set them. This inflates the gap count and makes the gaps panel look inaccurate.

**Fix**: Use a more explicit check: treat `null`, `undefined`, and empty string as missing, but allow `0` as a valid value for numeric fields (or at minimum, exclude Min/Max Speed from the check since they default to 0 and are less critical than process flow and camera config).

**File**: `src/pages/app/solutions/hooks/lineCompletenessCheck.ts`
- Change the value check to distinguish between "not set" (`null`/`undefined`/`""`) and "set to zero".

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/app/solutions/tabs/SolutionsLines.tsx` | Re-fetch lines + completeness when switching from multi-line back to table view |
| `src/pages/app/solutions/hooks/lineCompletenessCheck.ts` | Fix falsy-value check so `0` is not treated as "missing" for numeric fields |

No database changes. No new files.

