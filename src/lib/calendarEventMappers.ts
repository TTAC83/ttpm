import "temporal-polyfill/global";
import type { CalendarEvent, EventScope } from "./calendarEventsService";

// Schedule-X v4 requires Temporal.PlainDate (all-day) or Temporal.ZonedDateTime (timed) for start/end.
// We model all events as all-day using Temporal.PlainDate.

export interface SXEvent {
  id: string;
  title: string;
  start: Temporal.PlainDate;
  end: Temporal.PlainDate;
  calendarId: string;
  description?: string;
  _meta: CalendarEvent;
}

export const scopeToCalendarId = (
  scope: EventScope,
  isCritical: boolean
): string => {
  if (isCritical) return "critical";
  return scope; // 'implementation' | 'solutions' | 'standalone'
};

const toPlainDate = (iso: string): Temporal.PlainDate => {
  // Take YYYY-MM-DD portion (date-only convention used in this project)
  const dateOnly = iso.slice(0, 10);
  return globalThis.Temporal.PlainDate.from(dateOnly);
};

export const toScheduleXEvent = (ev: CalendarEvent): SXEvent => ({
  id: ev.id,
  title: ev.title + (ev.is_critical ? " ⚠" : ""),
  start: toPlainDate(ev.start_date),
  end: toPlainDate(ev.end_date),
  calendarId: scopeToCalendarId(ev.scope, ev.is_critical),
  description: ev.description ?? undefined,
  _meta: ev,
});

// SX returns a Temporal.PlainDate (or its string form) on drag for all-day events.
// Convert back to an ISO string compatible with our DB columns.
export const sxDateToDbString = (sxDate: string | Temporal.PlainDate): string => {
  const s = typeof sxDate === "string" ? sxDate : sxDate.toString();
  if (s.length === 10) return `${s}T00:00:00+00:00`;
  return s;
};
