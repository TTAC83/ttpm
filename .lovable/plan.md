## GOSPA — Per-Entry Authorship & Edit Restrictions

Today every GOSPA question card lets anyone in the allow-list edit the same single Summary / Risks / Opportunities / Links fields. We'll change the model so each entry is its own row, badged with the author's name, and only that author (the "owner") can edit or delete it.

### What the user will see

For each question card:

- **"Add a summary point" / "Add a risk" / "Add an opportunity" / "Add a link"** input row at the top of each section — submitting creates a new entry owned by the current user.
- Each existing entry renders as its own row with:
  - The entry text (or clickable link) on the left.
  - An **"Added by {Name}"** badge on the right.
  - Edit / delete controls **only visible to the entry's author** — for everyone else the entry is read-only.
- The question title row also gets an **"Added by {Name}"** badge. Only the question's creator can rename or delete the whole question.

Links section keeps the existing "click-to-open in new tab" behaviour.

### Database changes (one migration)

New table `gospa_question_entries`:

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → gospa_questions, on delete cascade | |
| `entry_type` | text, check in (`summary`, `risk`, `opportunity`, `link`) | |
| `content` | text | the summary text / risk text / link URL |
| `created_by` | uuid (auth.users) not null default auth.uid() | the owner |
| `created_at` / `updated_at` | timestamptz | |

RLS policies:
- **SELECT**: any GOSPA-allowed user (`gospa_can_read()`).
- **INSERT**: `gospa_can_read()` AND `created_by = auth.uid()`.
- **UPDATE / DELETE**: `created_by = auth.uid()` (author only).

Add `created_by uuid` to `gospa_questions` (nullable, default `auth.uid()`), and tighten the existing UPDATE/DELETE policies on `gospa_questions` so only the question's `created_by` can rename or delete it (read/insert stay unchanged). Existing rows with NULL `created_by` will be editable by everyone (legacy fallback) — we'll backfill where possible.

### Code changes

- **`src/lib/gospaService.ts`** — add `listQuestionEntries(questionId)`, `createQuestionEntry({question_id, entry_type, content})`, `updateQuestionEntry(id, content)`, `deleteQuestionEntry(id)`.
- **`src/pages/app/gospa/ObjectiveWorkspace.tsx`** — replace the four single-field textareas in each question card with four `EntrySection` blocks (Summary / Risks / Opportunities / Links). Each block:
  - Lists entries from `gospa_question_entries` for that question + `entry_type`.
  - Shows author name (resolved via a small profile lookup query keyed by `created_by`).
  - Renders edit/delete controls only when `entry.created_by === currentUser.id`.
  - For `entry_type='link'`, renders content as a clickable badge with `ExternalLink` icon (reusing existing normalisation).
- A small helper hook `useGospaUserNames(userIds)` batches profile fetches via the existing secure profile path (`get_safe_profile_info` or a single `profiles` select restricted to the 5 allow-list users).
- The existing `answer_text` / `evidence` / `risks` / `opportunities` columns on `gospa_questions` stay in place (legacy data preserved, but UI no longer reads/writes them).

### Out of scope

- No changes to Strategies, Plans, Actions, Metrics, Decisions, Blockers — those keep current behaviour.
- No data migration of existing single-field text into per-entry rows (existing values become invisible in the new UI; if needed we can add a one-off backfill in a follow-up).
- The 5-user GOSPA allow-list itself is unchanged.
