## Goal

Let users create calendar events directly from `/app/calendar`, attached to either an Implementation Project or a Solutions Project (Company is just a filter, not stored). Also allow truly standalone events (no project), and add attendee selection plus an attendee multi-select filter on the calendar.

---

## 1. Data Engineer view

### Current state
`project_events` columns: `project_id` (nullable), `solutions_project_id` (nullable), `project_type`, `title`, `description`, `start_date`, `end_date`, `is_critical`, `created_by`.

A check constraint **`events_project_check`** currently forces XOR — exactly one of `project_id` / `solutions_project_id` must be set. This blocks standalone events.

`event_attendees`: `id`, `event_id`, `user_id` — fine as-is.

### Schema changes (one migration)

No new columns. Just relax the constraint and add helpful indexes.

```sql
ALTER TABLE public.project_events
  DROP CONSTRAINT events_project_check;

-- New rule: at most one of project_id / solutions_project_id (both null = standalone)
ALTER TABLE public.project_events
  ADD CONSTRAINT project_events_project_xor CHECK (
    NOT (project_id IS NOT NULL AND solutions_project_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS project_events_start_date_idx ON public.project_events(start_date);
CREATE INDEX IF NOT EXISTS event_attendees_user_id_idx ON public.event_attendees(user_id);
```

### RLS update

Replace `project_events_all` so standalone events (both nulls) are visible/insertable by internal users only. Existing project- and solutions-scoped paths unchanged.

```sql
DROP POLICY project_events_all ON public.project_events;
CREATE POLICY project_events_all ON public.project_events FOR ALL
USING (
  is_internal()
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = project_events.project_id AND p.company_id = user_company_id()))
  OR (solutions_project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM solutions_projects sp WHERE sp.id = project_events.solutions_project_id AND sp.company_id = user_company_id()))
)
WITH CHECK (
  is_internal()
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = project_events.project_id AND p.company_id = user_company_id()))
  OR (solutions_project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM solutions_projects sp WHERE sp.id = project_events.solutions_project_id AND sp.company_id = user_company_id()))
);
```

### Attendee filter (read path)
No schema change. List query becomes:
```sql
SELECT e.* FROM project_events e
WHERE EXISTS (SELECT 1 FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = ANY($1));
```

---

## 2. UX view

### Mental model
Three event types from one dialog:
1. Implementation Project event
2. Solutions Project event
3. Standalone (internal) event — no project at all

Company is **only a filter** to narrow the project lists; it is never stored on the event.

### Calendar page changes (`/app/calendar`)

1. **"+ New Event"** button in the page header.
2. **Filters card** keeps the Company filter and adds:
   - **Attendees** multi-select using the existing `MultiSelectCombobox` `inline` pattern (per `docs/ux-patterns.md`). Selected users appear as removable chips.
   - **Project type** quick filter: All / Implementation / Solutions / Standalone.
3. **Day cells** get a hover `+` icon → opens dialog with that date pre-filled.
4. **Event cards** in the list:
   - Show project name + company OR a "Standalone" badge if no project.
   - Show attendee avatars (max 5 + "+N").
   - Edit / Delete menu visible to internal users or the event creator.

### New Event dialog

```
Title*                                [ Critical event ☐ ]
Description
Start date*               End date*
─────────────────────────────────
Scope
  ◯ Implementation project
  ◯ Solutions project
  ◯ Standalone (internal only)

  Company filter   [ Select… ]   ← optional, narrows the project list
  Project          [ Combobox, filtered by company + scope ]
                   helper: "Company auto-fills from the chosen project"
─────────────────────────────────
Attendees          [ Multi-select chips ]
                                     [Cancel] [Create event]
```

Behaviour:
- Default scope = Implementation project.
- Picking a Company filters the Project combobox; picking a Project auto-displays its Company (read-only badge).
- Switching scope clears the project field.
- Standalone scope hides the Company + Project rows entirely.
- External (customer) users only see Implementation / Solutions options for projects in their own company; Standalone is hidden.

### Why this matches the brief
- No "company only" events — company is purely a project filter, not a stored field.
- Standalone events handled cleanly without polluting any dummy project.
- Attendees become both a stored relationship and a primary filter.

---

## 3. Frontend implementation

### Files to add
- `src/components/CreateGlobalEventDialog.tsx` — the new dialog. Scope radio, Company filter combobox, Project combobox, AttendeeMultiSelect, dates, critical, description.
- `src/components/AttendeeMultiSelect.tsx` — reusable wrapper around `MultiSelectCombobox` (with `inline`) listing internal users (and customer-side members for the chosen project's company). Returns `string[]` of `user_id`s. Used by both the dialog and the page filter.
- `src/lib/calendarEventsService.ts` — central service:
  - `listEvents({ companyId, projectType, attendeeUserIds })`
  - `createEvent(payload)` / `updateEvent(...)` / `deleteEvent(...)`
  - Internally batches enrichment for projects, solutions_projects, companies, attendees.

### Files to modify
- `src/pages/app/GlobalCalendar.tsx`
  - Add header "+ New Event" button.
  - Add Attendee multi-select filter and Project-type filter alongside Company.
  - Replace inline fetch logic with `calendarEventsService.listEvents`.
  - Render `Standalone` badge on event cards that have neither project_id nor solutions_project_id.
  - Show attendee avatars on each event card; expose Edit/Delete for internal users / creator.
  - Day-cell hover `+` opens the dialog with the date pre-filled.
- `src/lib/projectEventsService.ts` — extend `createEvent` types to allow both `project_id` and `solutions_project_id` to be omitted (standalone). Existing project-scoped callers unchanged.
- `src/components/CreateEventDialog.tsx` (project pages) — switch its checkbox attendee list to `AttendeeMultiSelect` for visual consistency. No behaviour change.

### Data flow

```
GlobalCalendar
 ├─ Filters: Company | Project type | Attendees (multi)
 ├─ calendarEventsService.listEvents(filters)
 │     └─ project_events (RLS) → batched enrichment
 ├─ Calendar grid (day cells with + on hover)
 ├─ Event list (Standalone badge | project+company | attendees)
 └─ CreateGlobalEventDialog
       ├─ Scope radio (impl / solutions / standalone)
       ├─ Company filter combobox (filters projects)
       ├─ Project combobox (filtered)
       ├─ AttendeeMultiSelect
       └─ submit → calendarEventsService.createEvent + event_attendees insert
```

### Edge cases
- Picking a Project sets the Company display automatically.
- Switching Company clears the Project selection if it no longer matches.
- Standalone scope passes both `project_id` and `solutions_project_id` as null — relies on the relaxed constraint.
- Editing pre-populates scope/project/attendees and uses a delete-and-recreate for `event_attendees` (matches existing `projectEventsService.updateEvent`).

### Out of scope
- ICS export / Google Calendar sync.
- Email/push notifications to attendees.
- Recurring events.

---

## Migration summary
1 migration: drop old XOR constraint, add looser one (project vs solutions only), add indexes, replace RLS policy to permit standalone rows for internal users.

## Component summary
- New: `CreateGlobalEventDialog`, `AttendeeMultiSelect`, `calendarEventsService`.
- Edited: `GlobalCalendar.tsx`, `projectEventsService.ts`, `CreateEventDialog.tsx`.
