

## Pre-fill Phase Toggles from Most Recent Prior Selection

### Problem
The carry-forward of `phase_installation`, `phase_onboarding`, `phase_live` (and their details) only runs when **no** review row exists for the current week. As soon as the user toggles anything else (status/health), an auto-save creates a row with phases defaulted to `false`, and from then on phases load as `false` and the user has to set them again.

### Fix — always inherit phases from the latest prior review

**1. Always fetch the latest prior review (`src/pages/app/ImplementationWeeklyReview.tsx`)**
- Remove the `enabled: !reviewQ.isLoading && reviewQ.data === null` gate on `previousReviewQ` so it always runs alongside `reviewQ`.

**2. Treat phases as inherited fields, not per-week fields**
- Phase pre-fill priority for the form state:
  1. If current-week row has `phase_installation === true` → use it (user explicitly set it this week).
  2. Else if current-week row has any phase explicitly set (non-null in DB, after we adjust loading) → use it.
  3. Else → fall back to the latest prior review's phase values.
- Practically: in the "load saved data" effect, when `reviewQ.data` exists but **all phase booleans are false AND all phase details are empty**, fall back to `previousReviewQ.data` for the phase fields (and hypercare). This catches the common case where a current-week row was created by an early auto-save before phases populated.

**3. Prevent the default-false race on first interaction**
- On reset (line 642–659), do **not** set phases to `false` immediately. Initialise phases to `null` (or skip resetting them) and only populate after either `reviewQ` or `previousReviewQ` resolves.
- Block `triggerImmediateSave` / `autoSave` until both `reviewQ` and `previousReviewQ` have settled (extend the `isLoadingRef` gate to wait for `previousReviewQ.isLoading === false` as well). This guarantees the first auto-save includes the inherited phases.

**4. Auto-persist inherited phases on first auto-save**
- The existing carry-forward block (lines 686–733) already writes inherited phases to the new week. Extend that same write path so that when phases were inherited and the user makes any change, the saved row reflects those inherited values plus the new change.

### Files to modify
| File | Change |
|------|--------|
| `src/pages/app/ImplementationWeeklyReview.tsx` | Always run `previousReviewQ`; fall back to its phase values when current row's phases are empty; gate auto-save until both queries settle; persist inherited phases on first save |

### Edge cases
- First-ever review for a customer (no prior review): phases default to `false` (current behaviour).
- User explicitly turns a phase **off** this week: the row will have `phase_x = false` plus other fields set (status, notes, etc.), so the "all phases false AND all details empty" fallback won't trigger — explicit off is preserved.
- Hypercare follows the same inheritance pattern (already partly handled in the left-pane fallback query).

### No DB or backend changes required.

