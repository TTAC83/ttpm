## GOSPA Questions: User-Defined + UI Cleanup

Currently each new objective auto-seeds 6 fixed questions, each card shows Answer/Evidence/Risks/Opportunities + a Confidence slider. Change so users define their own questions, drop confidence, and rename Evidence → Summary.

### Changes

**1. Database migration**
- Drop the auto-seed trigger `gospa_seed_questions_trg` on `gospa_objectives` (and the associated `gospa_seed_questions()` function) so new objectives start with zero questions.
- Existing seeded questions stay in place; users can edit titles or delete them.
- (No column changes — `evidence` and `confidence_score` columns remain in the schema for backward compatibility with existing data, but the UI will stop using `confidence_score` and will relabel `evidence` as "Summary".)

**2. `src/pages/app/gospa/ObjectiveWorkspace.tsx` — Questions tab**
- Add an inline "Add question" row at the top of the tab (writes a new `gospa_questions` row with the next `order_index` and the user-typed `question_text`).
- Make the question title itself editable (Input bound to `question_text`, save on blur).
- Add a delete (trash) button per question card.
- Rename the "Evidence" placeholder/label to **"Summary"** (column stays `evidence` under the hood).
- Remove the Confidence label + Slider entirely.
- Update the AI summary button copy from "Generate AI summary from 6 answers" to "Generate AI summary from answers".
- Update the GoalsList toast "Objective created (6 questions auto-seeded)" → "Objective created".

**3. `src/lib/gospaService.ts`**
- Add `createQuestion({ objective_id, question_text, order_index })` and `deleteQuestion(id)` helpers.

### Out of scope
- No changes to Strategies, Plans, Actions, Metrics, Risks tabs.
- The `confidence_score` and `evidence` columns are kept (no destructive schema change); only the UI is updated.
