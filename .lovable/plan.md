

## Feasibility Gate Sign-Off Feature

### Overview

Transform the "Feasibility Gate" badge from a passive indicator into an interactive sign-off workflow. When all gate items are green, the Solutions Consultant can click the badge, review a summary, and formally sign off by entering their password.

### Database Change

Add columns to `solutions_projects`:

```text
feasibility_signed_off        boolean   DEFAULT false
feasibility_signed_off_by     uuid      FK -> auth.users(id)
feasibility_signed_off_at     timestamptz
```

No new table needed -- this is a single sign-off event per project.

### UX Flow

1. **Feasibility Gate badge** becomes clickable (a button). It shows three visual states:
   - Red: Not all tabs are green -- clicking shows which items are incomplete
   - Amber/pulsing: All tabs are green but not yet signed off -- ready for sign-off
   - Green with a shield/check icon: Signed off

2. **Clicking the badge** opens a Dialog with two sections:

   **Section A -- High-Level Summary** (read-only cards):
   - Number of Lines (count from `solutions_lines`)
   - Number of Cameras (count from `cameras` via line traversal)
   - Number of IoT Devices (count from `iot_devices` via line traversal)
   - Distinct Use Cases list: vision use case names from `camera_use_cases` joined to `vision_use_cases_master`, plus "IoT" if any IoT devices exist

   **Section B -- Sign-Off** (only visible when all tabs are green):
   - Text: "By signing off, you confirm the feasibility assessment is complete."
   - Shows the assigned Solutions Consultant name
   - Password input field (only the assigned Solutions Consultant can sign off)
   - "Sign Off" button
   - If the current user is not the assigned Solutions Consultant, show a message: "Only the assigned Solutions Consultant can sign off."

3. **Password verification**: Call `supabase.auth.signInWithPassword()` using the current user's email and the entered password. If successful, update the project record. This re-authenticates the current session user -- it does not log them out.

4. **After sign-off**: The badge turns green with a check/shield icon. The dialog shows who signed off and when. The sign-off is permanent (no undo from UI).

### Visual States for the Badge

| State | Appearance |
|-------|------------|
| Tabs incomplete | Red badge, text "Feasibility Gate" |
| All tabs green, not signed off | Amber/orange badge, clickable |
| Signed off | Green badge with shield-check icon |

### Technical Changes

**1. Migration** -- Add three columns to `solutions_projects`.

**2. `useTabCompleteness.ts`** -- No changes needed (existing logic already tracks tab completeness).

**3. New component: `FeasibilityGateDialog.tsx`**
   - Receives: `projectId`, `solutionsConsultantId`, `allTabsGreen`, `signedOff`, `signedOffBy`, `signedOffAt`
   - Fetches summary data (line/camera/IoT/use-case counts) via Supabase queries
   - Renders summary cards and sign-off form
   - Handles password verification and project update

**4. `SolutionsProjectDetail.tsx`**
   - Replace the static Feasibility Gate `<span>` with a clickable `<Button>` that opens `FeasibilityGateDialog`
   - Add the `feasibility_signed_off`, `feasibility_signed_off_by`, `feasibility_signed_off_at` fields to the project query and interface
   - Pass sign-off state to the badge for visual styling
   - Fetch the Solutions Consultant's profile name for display

### Files Affected

| File | Change |
|------|--------|
| `supabase/migrations/[new]` | Add 3 columns to `solutions_projects` |
| `src/integrations/supabase/types.ts` | Auto-regenerated |
| `src/components/FeasibilityGateDialog.tsx` | New component |
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | Badge becomes interactive button, opens dialog |

