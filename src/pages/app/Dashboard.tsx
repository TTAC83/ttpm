import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateUK } from '@/lib/dateUtils';

interface Company {
  id: string;
  name: string;
  is_internal: boolean;
  project_count: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'action' | 'calendar';
  is_critical?: boolean;
  status?: string;
  project: {
    name: string;
    company: {
      name: string;
    };
  };
}

export const Dashboard = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate 7-day date range (previous 2 days, today, next 4 days)
  const generateDateRange = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = -2; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const dateRange = generateDateRange();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch companies with project counts
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            is_internal,
            projects(count)
          `);

        if (companiesError) throw companiesError;

        const companiesWithCounts = companiesData?.map(company => ({
          id: company.id,
          name: company.name,
          is_internal: company.is_internal,
          project_count: company.projects?.[0]?.count || 0
        })) || [];

        setCompanies(companiesWithCounts);

        // Fetch upcoming events for the 7-day range
        const startDate = dateRange[0].toISOString().split('T')[0];
        const endDate = dateRange[dateRange.length - 1].toISOString().split('T')[0];
        
        const allEvents: UpcomingEvent[] = [];

        // Fetch critical tasks with planned dates within range (filter by critical statuses)
        const { data: tasksData, error: tasksError } = await supabase
          .from('project_tasks')
          .select(`
            id,
            task_title,
            planned_start,
            planned_end,
            status,
            project_id,
            projects!inner(
              name,
              companies!inner(name)
            )
          `)
          .or(`planned_start.gte.${startDate},planned_end.gte.${startDate}`)
          .or(`planned_start.lte.${endDate},planned_end.lte.${endDate}`)
          .not('planned_start', 'is', null)
          .in('status', ['Blocked']); // Only blocked tasks (considered critical)

        if (!tasksError && tasksData) {
          tasksData.forEach(task => {
            // Add event for planned start date
            if (task.planned_start && task.planned_start >= startDate && task.planned_start <= endDate) {
              allEvents.push({
                id: `task-start-${task.id}`,
                title: `${task.task_title} (Start)`,
                date: task.planned_start,
                type: 'task',
                status: task.status,
                project: {
                  name: (task.projects as any).name,
                  company: { name: (task.projects as any).companies.name }
                }
              });
            }
            // Add event for planned end date
            if (task.planned_end && task.planned_end >= startDate && task.planned_end <= endDate && task.planned_end !== task.planned_start) {
              allEvents.push({
                id: `task-end-${task.id}`,
                title: `${task.task_title} (End)`,
                date: task.planned_end,
                type: 'task',
                status: task.status,
                project: {
                  name: (task.projects as any).name,
                  company: { name: (task.projects as any).companies.name }
                }
              });
            }
          });
        }

        // Fetch critical actions with planned dates within range
        const { data: actionsData, error: actionsError } = await supabase
          .from('actions')
          .select(`
            id,
            title,
            planned_date,
            status,
            is_critical,
            project_task_id,
            project_tasks!inner(
              project_id,
              projects!inner(
                name,
                companies!inner(name)
              )
            )
          `)
          .gte('planned_date', startDate)
          .lte('planned_date', endDate)
          .not('planned_date', 'is', null)
          .eq('is_critical', true); // Only critical actions

        if (!actionsError && actionsData) {
          actionsData.forEach(action => {
            allEvents.push({
              id: `action-${action.id}`,
              title: action.title,
              date: action.planned_date,
              type: 'action',
              status: action.status,
              is_critical: action.is_critical,
              project: {
                name: (action.project_tasks as any).projects.name,
                company: { name: (action.project_tasks as any).projects.companies.name }
              }
            });
          });
        }

        // Fetch critical calendar events within range
        const { data: calendarData, error: calendarError } = await supabase
          .from('project_events')
          .select(`
            id,
            title,
            start_date,
            end_date,
            is_critical,
            project_id
          `)
          .or(`start_date.gte.${startDate},end_date.gte.${startDate}`)
          .or(`start_date.lte.${endDate},end_date.lte.${endDate}`)
          .eq('is_critical', true); // Only critical calendar events

        if (!calendarError && calendarData) {
          // Get project and company info for calendar events
          const projectIds = [...new Set(calendarData.map(event => event.project_id))];
          const { data: projectsData } = await supabase
            .from('projects')
            .select(`
              id,
              name,
              companies!inner(name)
            `)
            .in('id', projectIds);
          
          const projectMap = new Map(projectsData?.map(p => [p.id, p]) || []);
          
          calendarData.forEach(event => {
            const project = projectMap.get(event.project_id);
            if (!project) return;
            
            // For multi-day events, add for each day in range
            const eventStart = new Date(event.start_date);
            const eventEnd = new Date(event.end_date);
            const rangeStart = new Date(startDate);
            const rangeEnd = new Date(endDate);
            
            const currentDate = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));
            const endDateToCheck = new Date(Math.min(eventEnd.getTime(), rangeEnd.getTime()));
            
            while (currentDate <= endDateToCheck) {
              allEvents.push({
                id: `calendar-${event.id}-${currentDate.toISOString().split('T')[0]}`,
                title: event.title,
                date: currentDate.toISOString().split('T')[0],
                type: 'calendar',
                is_critical: event.is_critical,
                project: {
                  name: project.name,
                  company: { name: (project.companies as any).name }
                }
              });
              currentDate.setDate(currentDate.getDate() + 1);
            }
          });
        }

        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Client overview and upcoming events
        </p>
      </div>
      
      {/* 7-Day Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Critical Events</CardTitle>
          <CardDescription>Critical tasks, actions, and events for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dateRange.map((date, index) => {
              const dayEvents = getEventsForDate(date);
              const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
              const dayNumber = date.getDate();
              
              return (
                <div
                  key={index}
                  className={`p-3 border rounded-lg min-h-[120px] ${
                    isToday(date) ? 'bg-primary/5 border-primary' : ''
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs text-muted-foreground">{dayName}</div>
                    <div className={`text-sm font-medium ${isToday(date) ? 'text-primary' : ''}`}>
                      {dayNumber}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => {
                      const getEventColor = () => {
                        if (event.is_critical) {
                          return 'bg-destructive/10 text-destructive border border-destructive/20';
                        }
                        switch (event.type) {
                          case 'task':
                            return 'bg-info/10 text-info border border-info/20';
                          case 'action':
                            return 'bg-warning/10 text-warning border border-warning/20';
                          case 'calendar':
                            return 'bg-accent/10 text-accent border border-accent/20';
                          default:
                            return 'bg-primary/10 text-primary border border-primary/20';
                        }
                      };

                      const getEventIcon = () => {
                        switch (event.type) {
                          case 'task':
                            return '📋';
                          case 'action':
                            return '⚡';
                          case 'calendar':
                            return '📅';
                          default:
                            return '📅';
                        }
                      };

                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded text-left ${getEventColor()}`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]">{getEventIcon()}</span>
                            <div className="font-medium truncate" title={event.title}>
                              {event.title}
                            </div>
                          </div>
                          <div className="text-muted-foreground truncate" title={event.project.company.name}>
                            {event.project.company.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Client Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Summary</CardTitle>
          <CardDescription>Overview of all clients and their projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div key={company.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{company.name}</h3>
                  <Badge variant={company.is_internal ? 'default' : 'outline'}>
                    {company.is_internal ? 'Internal' : 'External'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {company.project_count} project{company.project_count !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;