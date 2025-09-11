import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { formatDateUK } from "@/lib/dateUtils";
import { addMonths, format } from "date-fns";

interface Company {
  id: string;
  name: string;
}

interface ProjectEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_critical: boolean;
  project_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  projects?: {
    name: string;
    companies?: {
      name: string;
    };
  };
}

export const GlobalCalendar = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_internal', false)
        .order('name');
      
      if (data) {
        setCompanies(data);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('project_events')
          .select(`
            *,
            projects!inner(
              name,
              companies!inner(
                name
              )
            )
          `)
          .order('start_date', { ascending: true });

        // Filter by company if selected
        if (selectedCompany !== 'all') {
          query = query.eq('projects.companies.id', selectedCompany);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching events:', error);
        } else if (data) {
          console.log('Fetched events:', data);
          setEvents(data as any);
        }
      } catch (error) {
        console.error('Error in fetchEvents:', error);
      }
      
      setLoading(false);
    };

    fetchEvents();
  }, [selectedCompany]);

  const getEventDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const isEventCurrent = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return today >= start && today <= end;
  };

  const isEventUpcoming = (startDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    return start > today;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      return date >= eventStart && date <= eventEnd;
    });
  };

  const currentMonth = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Global Calendar</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Views */}
      <div className="space-y-6">
        {/* Current Month */}
        <Card>
          <CardHeader>
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              month={currentMonth}
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
                Day: ({ date, ...props }) => {
                  const dayEvents = getEventsForDate(date);
                  return (
                    <div className="h-full w-full p-1 flex flex-col">
                      <span className="text-sm font-medium mb-1">{date.getDate()}</span>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              event.is_critical 
                                ? 'bg-destructive text-destructive-foreground' 
                                : 'bg-primary text-primary-foreground'
                            }`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Next Month */}
        <Card>
          <CardHeader>
            <CardTitle>{format(nextMonth, 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              month={nextMonth}
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
                Day: ({ date, ...props }) => {
                  const dayEvents = getEventsForDate(date);
                  return (
                    <div className="h-full w-full p-1 flex flex-col">
                      <span className="text-sm font-medium mb-1">{date.getDate()}</span>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              event.is_critical 
                                ? 'bg-destructive text-destructive-foreground' 
                                : 'bg-primary text-primary-foreground'
                            }`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Events */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calendar events found</p>
              {selectedCompany !== 'all' && (
                <p className="text-sm mt-2">Try selecting "All Companies" to see more events</p>
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
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        {event.is_critical && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </Badge>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Project:</span> {event.projects?.name}
                        </div>
                        <div>
                          <span className="font-medium">Company:</span> {event.projects?.companies?.name}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {getEventDuration(event.start_date, event.end_date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1 ml-4">
                      <div className="text-sm font-medium">
                        {formatDateUK(event.start_date)}
                        {event.start_date !== event.end_date && (
                          <> - {formatDateUK(event.end_date)}</>
                        )}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalCalendar;