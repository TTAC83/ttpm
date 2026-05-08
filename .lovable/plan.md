# Adding a "Last Active" date to profiles

## Goal
Replace the misleading "Last Sign In" on the Profile page with a "Last Active" date (date only, no time), visible only to the profile owner and to `@thingtrax.com` users (with Allan included by virtue of his email).

---

## Perspective 1 — Database Engineer

### Storage cost
- One `date` column on `profiles` = **4 bytes per user**. Negligible.
- Even at 10,000 users that's ~40 KB. No index needed for this use case (we never query by it).

### Write cost — this is the real consideration
Every session refresh would otherwise cause a write. The auth refresh in `useAuth.tsx` runs **every 4 minutes** plus on every tab focus. For an active user that's ~120 writes/day per user — wasteful and noisy in WAL/audit logs.

**Recommended write strategy: throttle to once per UTC day per user.**
- Update only if `last_active_at IS NULL OR last_active_at < CURRENT_DATE`.
- Result: **at most 1 write per user per day**, regardless of how many refreshes/tab-focuses happen.
- For ~50 daily active users that's ~50 writes/day. Trivial.

### Where to write from
Two options:
1. **Client-side** from `useAuth.tsx` after a successful `getSession()` — simple, but client can be tampered with (low risk for a "last active" field).
2. **Postgres function** `touch_last_active()` called via RPC, with the date-gate inside the function. Cleaner, single source of truth, RLS-safe.

Recommend **option 2** — one RPC, one round-trip per day per user.

### Schema impact
- Add `profiles.last_active_at date` (nullable). No migration of existing data needed; it backfills naturally as users return.
- No changes to `auth` schema (forbidden anyway).

### Risks / things to avoid
- Do **not** create a trigger on `auth.sessions` or any `auth.*` table — Supabase reserved.
- Do **not** add this to the existing `updated_at` trigger on profiles, otherwise editing your name would also mark you "active".

---

## Perspective 2 — UX / UI Designer

### Is "Last Active" actually useful to the user?
Honestly, on your **own** profile it's low value — you already know when you were last here. It's mostly useful for **admins** assessing whether other accounts are dormant (license cleanup, security review, off-boarding).

### Date-only is the right call
- Removes false precision. "Active today" / "2 days ago" reads better than a timestamp.
- Eliminates timezone confusion (you previously hit this with vision models — your memory already enforces UK-time for date-only fields).

### Better presentation than a raw date
Show **relative time** with the absolute date in a tooltip:
- "Active today"
- "Active yesterday"
- "Active 3 days ago"
- Tooltip: `08 May 2026`

### Visibility scoping
"Visible to myself + @thingtrax.com" is sensible. But consider:
- This is essentially **internal-only** data. Your existing `is_internal` flag on profiles already covers Thingtrax staff.
- Recommend gating on `is_internal = true OR user_id = auth.uid()` rather than hard-coding the email domain. Future-proof, and you don't need a separate Allan rule.
- If you specifically want "Thingtrax email" rather than "marked internal", we can email-domain check, but `is_internal` is the cleaner pattern already in use across the codebase (`is_internal()` SQL function exists).

### Where to show it
- Profile page: replace the "Last Sign In" row in the **Account Information** card.
- Optionally also show in `/app/admin/users` user list — far more useful there for admins identifying dormant accounts.

---

## Perspective 3 — Frontend Specialist

### Implementation footprint
Very small:
1. `useAuth.tsx` — after each successful session load/refresh, fire-and-forget call to `supabase.rpc('touch_last_active')`. No await on UI path. ~5 lines.
2. `Profile.tsx` — swap `user.last_sign_in_at` block for `profile.last_active_at`, conditionally rendered based on visibility rule. Add relative-time formatter (date-fns `formatDistanceToNow` already in deps).
3. `useAuth.tsx` `Profile` interface — add `last_active_at: string | null` and include in the `select`.
4. (Optional) Admin user list — add a column.

### Performance
- Throttled RPC = one extra request per user per day. Invisible.
- No re-render impact (last_active_at only read on Profile mount).

### Offline / PWA
Your offline queue handles mutations; if `touch_last_active` fails offline it doesn't matter — it'll get called again on next online refresh. Don't queue it; just swallow errors.

### Risks
- If the RPC errors, the auth flow must not break. Wrap in try/catch with no UI feedback.
- TypeScript types for `profiles` regenerate from Supabase — handled automatically after migration.

---

## Recommendation

**Worth doing — small effort, real value (mainly for admin/license hygiene).**

### Proposed approach
1. **DB**: Add `profiles.last_active_at date`. Create RPC `touch_last_active()` that updates only when the date has changed (1 write/user/day max).
2. **Visibility**: Use `is_internal OR self` rule (already a project pattern), not hard-coded email — covers Allan, you, and all `@thingtrax.com` staff cleanly.
3. **UX**: Replace "Last Sign In" on Profile with "Last Active" shown as relative time + absolute date tooltip. Hide the row entirely for non-internal users viewing their own profile (since it's low-value to them) — or keep it shown to self always; your call.
4. **Frontend**: Fire-and-forget RPC call inside the existing 4-minute refresh in `useAuth.tsx`.
5. **Bonus**: Add a "Last Active" column to `/app/admin/users` — this is where the data actually pays for itself.

### Reasons not to do it
- If the **only** consumer is your own Profile page, it's marginal value — you already know you logged in today. The strong case is the admin user list.
- If you wanted full audit-grade activity tracking (page views, feature usage, etc.), this is *not* that — it only proves the auth session was alive that day.

### Cost summary
| Item | Cost |
|---|---|
| Storage | 4 bytes/user — nil |
| Writes | ≤1 per user per day — nil |
| Code changes | ~30 lines across 3 files + 1 small migration |
| Ongoing maintenance | None |

Shall I proceed with this approach (internal-only visibility via `is_internal`, relative-time UI, plus the admin column)?
