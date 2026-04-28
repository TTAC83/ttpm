import type { CalendarEvent, EventScope } from "./calendarEventsService";

// Schedule-X uses 'YYYY-MM-DD' for all-day events.
// Our project_events.start_date / end_date are stored as ISO strings (date-only or full datetime).

export interface SXEvent {
  id: string;
  title: string;
  start: string; // 'YYYY-MM-DD' (all day)
  end: string;   // 'YYYY-MM-DD' (all day, inclusive in SX)
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

const toDateOnly = (iso: string): string => {
  // Take the YYYY-MM-DD portion of the ISO timestamp (UK / date-only convention used in this project)
  return iso.slice(0, 10);
};

export const toScheduleXEvent = (ev: CalendarEvent): SXEvent => ({
  id: ev.id,
  title: ev.title + (ev.is_critical ? " ⚠" : ""),
  start: toDateOnly(ev.start_date),
  end: toDateOnly(ev.end_date),
  calendarId: scopeToCalendarId(ev.scope, ev.is_critical),
  description: ev.description ?? undefined,
  _meta: ev,
});

// SX returns 'YYYY-MM-DD' on drag for all-day events. Convert back to an ISO string compatible with our DB columns.
export const sxDateToDbString = (sxDate: string): string => {
  // Keep date-only; database column accepts 'YYYY-MM-DD' or full ISO. Use midnight UTC ISO to match existing rows.
  if (sxDate.length === 10) return `${sxDate}T00:00:00+00:00`;
  return sxDate;
};
