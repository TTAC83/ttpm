# Switch Global Calendar to Schedule-X

Replace the current `react-day-picker`-based event grid with **Schedule-X** (`@schedule-x/react`), a modern, lightweight, MIT-licensed calendar built specifically for events. All backend, filters, dialogs, and permission logic stay the same — only the calendar view layer changes.

---

## 1. Data engineer perspective

Nothing in the database changes. `project_events`, attendees, RLS, and the `calendarEventsService` are already correct.

What does change is the **shape we hand to the view**. Schedule-X expects events in this format:

```ts
{
  id: string,
  title: string,
  start: 'YYYY-MM-DD HH:mm' | 'YYYY-MM-DD',  // date-only for all-day
  end:   'YYYY-MM-DD HH:mm' | 'YYYY-MM-DD',
  calendarId?: string,            // used for colour grouping
  // anything else lives in a custom payload we read in the modal
  _meta: CalendarEvent
}
```

We will add a tiny mapper in `src/lib/calendarEventsService.ts` (or a sibling `calendarEventMappers.ts`):

- `toScheduleXEvent(ev: CalendarEvent)` — converts our row to the SX shape.
  - All events are treated as **all-day** (our DB stores date-only `start_date`/`end_date`); SX detects this when `start`/`end` have no time component.
  - `calendarId` is derived from scope: `implementation` | `solutions` | `standalone`, with a separate `critical` override colour.
- `fromScheduleXDates(start, end)` — converts back to ISO date strings for save.

Filtering stays **service-side / client-side as today** — we just feed the filtered list into SX. SX itself is purely a view layer.

No migration, no RLS changes, no new tables.

---

## 2. UX / UI perspective

### Problems with the current calendar
- Two stacked months always visible → wastes vertical space, forces scroll.
- Cell heights jump as events render (`h-24` overrides on a date-picker).
- No week / day view — bad for days with many events.
- No drag-to-move, no click-an-event-to-open (we hijack click to create).
- "+3 more" is the only overflow handling.

### What Schedule-X gives us
- **Four views with one switcher**: Month grid, Month agenda, Week, Day.
- Stable cell sizes; events render as coloured chips with proper overflow handling.
- Click event → opens our existing edit dialog.
- Click empty slot → opens create dialog with that date pre-filled.
- Drag-and-drop to reschedule (optional plugin — we'll wire it to call `updateEvent`).
- Built-in "Today" button, prev/next, current-time indicator.
- Keyboard navigation and screen-reader labels out of the box.

### Proposed layout

```
┌────────────────────────────────────────────────────────────┐
│  📅 Global Calendar                       [+ New Event]    │
├────────────────────────────────────────────────────────────┤
│  Filters:  [Company ▾]  [Scope ▾]  [Attendees ▾]   [Reset] │
├────────────────────────────────────────────────────────────┤
│  Legend:  ● Implementation  ● Solutions  ● Standalone  ● Critical │
├────────────────────────────────────────────────────────────┤
│  [<] [Today] [>]   April 2026         [Month|Week|Day|List]│
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Schedule-X grid                      │  │
│  │  (fixed cell size, event chips coloured by scope)     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

The big "Calendar Events" list card below stays — it's useful as a filterable agenda when users want to scan everything. We'll move it into a collapsible "List view" section so the calendar is the hero.

### Colour mapping (uses existing design tokens, no hard-coded hex)
- Implementation → `--primary`
- Solutions → `--accent`
- Standalone → `--muted-foreground`
- Critical → `--destructive` (overrides scope colour and adds a small ⚠ icon in the chip)

---

## 3. Frontend implementation plan

### Dependencies
Add Schedule-X core + react adapter + plugins we actually need:

```
@schedule-x/react
@schedule-x/calendar
@schedule-x/theme-default
@schedule-x/events-service
@schedule-x/event-modal           (we'll suppress its built-in modal — see below)
@schedule-x/drag-and-drop
@schedule-x/current-time
```

All MIT-licensed, total bundle ~50 KB gzipped.

### New files
- `src/components/calendar/ScheduleXCalendar.tsx` — wraps `useCalendarApp` + `<ScheduleXCalendar />`, exposes `onEventClick`, `onSlotClick`, `onEventUpdate` props.
- `src/lib/calendarEventMappers.ts` — `toScheduleXEvent`, `fromScheduleXDates`, scope→calendarId helper.
- `src/components/calendar/CalendarLegend.tsx` — small chip row.

### Edited files
- `src/pages/app/GlobalCalendar.tsx`
  - Remove the two `<Calendar>` cards + custom `renderDay`.
  - Replace with `<ScheduleXCalendar events={mappedEvents} ... />`.
  - Wire callbacks:
    - `onEventClick(ev)` → `setEditing(meta); setDialogOpen(true)`.
    - `onSlotClick(date)` → `setEditing(null); setDefaultDate(date); setDialogOpen(true)`.
    - `onEventUpdate({id, start, end})` → optimistic update + `calendarEventsService.updateEvent(...)`, with rollback on failure (uses existing `useSaveWithRetry` pattern from project memory).
  - Keep all filter state and the events-list card (made collapsible / "List view" toggle).
- `src/index.css` — import Schedule-X theme CSS (`@schedule-x/theme-default/dist/index.css`) and override the few CSS variables it exposes (`--sx-color-primary`, `--sx-internal-color-text`, etc.) so it picks up our shadcn tokens and dark mode.

### Drag-and-drop permission
`onEventUpdate` is gated by the same `canEdit(ev)` check we already use; non-editable events get `draggable: false` in the mapper.

### View persistence
Persist last-used view (`month-grid` | `week` | `day` | `month-agenda`) in `localStorage` so users land where they left off.

### Migration safety
- `CreateGlobalEventDialog`, `calendarEventsService`, RLS, attendee logic — all untouched.
- The current calendar code is removed in one commit; no behind-a-flag rollout (the existing UI is broken enough that a clean swap is preferable).
- Mobile / tablet: Schedule-X is responsive; week/day views work well on the Lenovo tablets used in the field (per project memory on tablet usage).

### Out of scope (can be follow-ups)
- Recurring events (DB doesn't model them).
- Resource view (one column per attendee) — possible later via SX's resource scheduler if needed.
- iCal export.

---

## Acceptance criteria
1. Month, Week, Day, and Agenda views available via a built-in switcher.
2. Cells / rows do not resize as events load.
3. Clicking an empty slot opens the existing create dialog with that date pre-filled.
4. Clicking an event opens the existing edit dialog (only if user can edit).
5. Dragging an event to a new date updates `start_date`/`end_date` in `project_events` and rolls back on error.
6. All existing filters (Company, Scope, Attendees) continue to drive both the calendar and the agenda list.
7. Colours follow design tokens and respect dark mode.
8. No database, RLS, or service-layer changes required.
