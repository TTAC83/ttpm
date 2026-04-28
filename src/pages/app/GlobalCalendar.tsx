import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, AlertTriangle, Plus, Pencil, Trash2, Users } from "lucide-react";
import { formatDateUK } from "@/lib/dateUtils";
import { addMonths, format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateGlobalEventDialog from "@/components/CreateGlobalEventDialog";
import {
  calendarEventsService,
  CalendarEvent,
  EventScope,
} from "@/lib/calendarEventsService";

type ScopeFilter = "all" | EventScope;

export const GlobalCalendar = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isInternal = !!profile?.is_internal;

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [internalUsers, setInternalUsers] = useState<{ user_id: string; name: string | null }[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [attendeeFilter, setAttendeeFilter] = useState<string[]>([]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Initial reference data
  useEffect(() => {
    calendarEventsService.listCompanies().then(setCompanies).catch(() => {});
    calendarEventsService.listInternalUsers().then(setInternalUsers).catch(() => {});
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await calendarEventsService.listEvents({
        companyId: selectedCompany,
        scope: scopeFilter,
        attendeeUserIds: attendeeFilter,
      });
      setEvents(data);
    } catch (e) {
      console.error(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, scopeFilter, attendeeFilter]);

  const getEventDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const isEventCurrent = (s: string, e: string) => {
    const today = new Date();
    return today >= new Date(s) && today <= new Date(e);
  };
  const isEventUpcoming = (s: string) => new Date(s) > new Date();

  const getEventsForDate = (date: Date) => {
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return events.filter(event => {
      const s = new Date(event.start_date);
      const e = new Date(event.end_date);
      const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
      return check >= sd && check <= ed;
    });
  };

  const currentMonth = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  const attendeeOptions = useMemo(
    () => internalUsers.map((u) => ({ value: u.user_id, label: u.name ?? "Unknown user" })),
    [internalUsers]
  );

  const canEdit = (ev: CalendarEvent) => isInternal || ev.created_by === profile?.user_id;

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await calendarEventsService.deleteEvent(confirmDeleteId);
      toast({ title: "Event deleted" });
      setConfirmDeleteId(null);
      fetchEvents();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "", variant: "destructive" });
    }
  };

  const renderDay = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    return (
      <div
        className="h-full w-full p-1 flex flex-col group cursor-pointer"
        onClick={() => {
          if (dayEvents.length === 0) {
            setEditing(null);
            setDefaultDate(date);
            setDialogOpen(true);
          }
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{date.getDate()}</span>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(null);
              setDefaultDate(date);
              setDialogOpen(true);
            }}
            aria-label="Add event on this date"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden">
          {dayEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className={`text-xs px-1 py-0.5 rounded truncate ${
                event.is_critical
                  ? 'bg-destructive text-destructive-foreground'
                  : event.scope === 'standalone'
                  ? 'bg-muted text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
              title={event.title}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit(event)) {
                  setEditing(event);
                  setDefaultDate(null);
                  setDialogOpen(true);
                }
              }}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Global Calendar</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDefaultDate(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Combobox
                options={[{ value: "all", label: "All companies" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
                value={selectedCompany}
                onValueChange={(v) => setSelectedCompany(v || "all")}
                placeholder="All companies"
                searchPlaceholder="Search companies..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scope</label>
              <Combobox
                options={[
                  { value: "all", label: "All events" },
                  { value: "implementation", label: "Implementation" },
                  { value: "solutions", label: "Solutions" },
                  { value: "standalone", label: "Standalone (internal)" },
                ]}
                value={scopeFilter}
                onValueChange={(v) => setScopeFilter((v as ScopeFilter) || "all")}
                placeholder="All events"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attendees</label>
              <MultiSelectCombobox
                options={attendeeOptions}
                selected={attendeeFilter}
                onSelectionChange={setAttendeeFilter}
                placeholder="Filter by attendees..."
                searchPlaceholder="Search team..."
                emptyMessage="No users."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Views */}
      <div className="space-y-6">
        {[currentMonth, nextMonth].map((month, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle>{format(month, 'MMMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                month={month}
                className="w-full pointer-events-auto"
                classNames={{
                  months: "flex flex-col space-y-4",
                  month: "space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md w-full font-normal text-sm p-2",
                  row: "flex w-full mt-2",
                  cell: "h-24 w-full text-center text-sm p-1 relative border border-border/50 hover:bg-muted/50",
                  day: "h-full w-full p-1 font-normal flex flex-col items-start justify-start hover:bg-muted/50 rounded-none",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50"
                }}
                components={{
                  Day: ({ date }) => renderDay(date),
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Events list */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse"><div className="h-20 bg-muted rounded-lg"></div></div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calendar events found</p>
              {(selectedCompany !== 'all' || scopeFilter !== 'all' || attendeeFilter.length > 0) && (
                <p className="text-sm mt-2">Try clearing filters to see more events</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 transition-colors hover:bg-muted/50 ${
                    isEventCurrent(event.start_date, event.end_date)
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800'
                      : isEventUpcoming(event.start_date)
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-950/50 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        {event.is_critical && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Critical
                          </Badge>
                        )}
                        {event.scope === 'standalone' ? (
                          <Badge variant="secondary">Standalone</Badge>
                        ) : (
                          <Badge variant="outline">
                            {event.scope === 'solutions' ? 'Solutions' : 'Implementation'}
                          </Badge>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {event.project_name && (
                          <div><span className="font-medium">Project:</span> {event.project_name}</div>
                        )}
                        {event.company_name && (
                          <div><span className="font-medium">Company:</span> {event.company_name}</div>
                        )}
                        <div><span className="font-medium">Duration:</span> {getEventDuration(event.start_date, event.end_date)}</div>
                      </div>

                      {event.attendees.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="truncate">
                            {event.attendees.map((a) => a.name ?? "Unknown").join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-2 ml-4 shrink-0">
                      <div className="text-sm font-medium">
                        {formatDateUK(event.start_date)}
                        {event.start_date !== event.end_date && (<> - {formatDateUK(event.end_date)}</>)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isEventCurrent(event.start_date, event.end_date) ? (
                          <Badge variant="secondary">Current</Badge>
                        ) : isEventUpcoming(event.start_date) ? (
                          <Badge variant="outline">Upcoming</Badge>
                        ) : (
                          <Badge variant="secondary">Past</Badge>
                        )}
                      </div>
                      {canEdit(event) && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(event);
                              setDefaultDate(null);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateGlobalEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingEvent={editing}
        defaultDate={defaultDate}
        onSaved={fetchEvents}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event and remove all attendees from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GlobalCalendar;
