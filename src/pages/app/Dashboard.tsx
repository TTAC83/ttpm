import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateUK } from '@/lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { BlockersDashboardCard } from '@/components/dashboard/BlockersDashboardCard';
import { Smile, Frown, CheckCircle, AlertCircle } from 'lucide-react';

interface ImplementationProject {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  domain: string;
  customer_health: 'green' | 'red' | null;
  project_status: 'on_track' | 'off_track' | null;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'action' | 'calendar';
  is_critical?: boolean;
  status?: string;
  project_id?: string;
  task_id?: string;
  project: {
    name: string;
    company: {
      name: string;
    };
  };
}

export const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ImplementationProject[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [allCalendarEvents, setAllCalendarEvents] = useState<UpcomingEvent[]>([]);
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

  const fetchDashboardData = async () => {
      try {
        // Get current week start for weekly reviews
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday of current week
        const weekStartStr = currentWeekStart.toISOString().split('T')[0];

        // Fetch implementation projects with weekly review data
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            company_id,
            domain,
            companies!inner(
              name
            )
          `)
          .in('domain', ['IoT', 'Vision', 'Hybrid'])
          .neq('companies.is_internal', true);

        if (projectsError) throw projectsError;

        // Get weekly reviews for current week
        const { data: reviewsData } = await supabase
          .from('impl_weekly_reviews')
          .select('company_id, customer_health, project_status')
          .eq('week_start', weekStartStr);

        const reviewsMap = new Map((reviewsData || []).map(r => [r.company_id, r]));

        const implementationProjects = (projectsData || []).map(project => ({
          id: project.id,
          name: project.name,
          company_id: project.company_id,
          company_name: (project.companies as any).name,
          domain: project.domain,
          customer_health: reviewsMap.get(project.company_id)?.customer_health || null,
          project_status: reviewsMap.get(project.company_id)?.project_status || null,
        }));

        setProjects(implementationProjects);

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
          .or('status.eq.Blocked,and(planned_end.lt.now(),planned_end.not.is.null)')
          .neq('status', 'Done')

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
                project_id: task.project_id,
                task_id: task.id,
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
                project_id: task.project_id,
                task_id: task.id,
                project: {
                  name: (task.projects as any).name,
                  company: { name: (task.projects as any).companies.name }
                }
              });
            }
          });
        }

        // Fetch critical actions within range (single query, no joins)
        const { data: actionsData, error: actionsError } = await supabase
          .from('actions')
          .select('id, title, planned_date, status, is_critical, project_task_id, project_id')
          .gte('planned_date', startDate)
          .lte('planned_date', endDate)
          .not('planned_date', 'is', null)
          .eq('is_critical', true)
          .neq('status', 'Done');

        if (actionsError) {
          console.warn('Actions query failed, continuing without actions:', actionsError);
        }

        const actionsWithTasksOnly = (actionsData || []).filter(a => a.project_task_id);
        const actionsWithoutTasksOnly = (actionsData || []).filter(a => !a.project_task_id && a.project_id);

        // Fetch related project_tasks for actions with tasks
        const projectTaskIds = [...new Set(actionsWithTasksOnly.map(a => a.project_task_id))] as string[];
        let projectTasksMap = new Map<string, { id: string; project_id: string }>();
          const { data: projectTasksData, error: projectTasksError } = await supabase
            .from('project_tasks')
            .select('id, project_id')
            .in('id', projectTaskIds);
          if (projectTasksError) {
            console.warn('Project tasks lookup failed, actions with tasks will be skipped:', projectTasksError);
          } else {
            projectTasksMap = new Map((projectTasksData || []).map(pt => [pt.id, pt as any]));
          }

        // Collect all project_ids to fetch their names and companies
        const projectIdsFromTasks = [...new Set(Array.from(projectTasksMap.values()).map(pt => pt.project_id))];
        const projectIdsFromActions = [...new Set(actionsWithoutTasksOnly.map(a => a.project_id as string))];
        const allProjectIds = [...new Set([...projectIdsFromTasks, ...projectIdsFromActions])];

        let projectsMap = new Map<string, { id: string; name: string; company_id: string | null }>();
        let companiesMap = new Map<string, { id: string; name: string }>();

        if (allProjectIds.length > 0) {
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, name, company_id')
            .in('id', allProjectIds);
          if (!projectsError && projectsData) {
            projectsMap = new Map((projectsData || []).map(p => [p.id, p as any]));

            const companyIds = [...new Set((projectsData || []).map(p => p.company_id).filter(Boolean))] as string[];
            if (companyIds.length > 0) {
              const { data: companiesData, error: companiesError } = await supabase
                .from('companies')
                .select('id, name')
                .in('id', companyIds);
              if (!companiesError && companiesData) {
                companiesMap = new Map((companiesData || []).map(c => [c.id, c as any]));
              } else {
                console.warn('Companies lookup failed, company names may be missing:', companiesError);
              }
            }
          } else {
            console.warn('Projects lookup failed, project names may be missing:', projectsError);
          }
        }

        // Process actions with tasks
        actionsWithTasksOnly.forEach(action => {
          const project = action.project_id ? projectsMap.get(action.project_id as string) : undefined;
          const company = project && project.company_id ? companiesMap.get(project.company_id) : null;

          allEvents.push({
            id: `action-${action.id}`,
            title: action.title,
            date: action.planned_date as string,
            type: 'action',
            status: action.status,
            is_critical: action.is_critical,
            project_id: (action.project_id as string) || undefined,
            project: {
              name: project?.name || 'Unknown Project',
              company: { name: company?.name || 'Unknown Company' }
            }
          });
        });

        // Process actions without tasks (direct project actions)
        actionsWithoutTasksOnly.forEach(action => {
          const project = action.project_id ? projectsMap.get(action.project_id as string) : null;
          if (!project) return;
          const company = project.company_id ? companiesMap.get(project.company_id) : null;

          allEvents.push({
            id: `action-${action.id}`,
            title: action.title,
            date: action.planned_date as string,
            type: 'action',
            status: action.status,
            is_critical: action.is_critical,
            project_id: action.project_id as string,
            project: {
              name: project?.name || 'Unknown Project',
              company: { name: company?.name || 'Unknown Company' }
            }
          });
        });


        // Fetch ONLY critical calendar events for the top chart
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
          .or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`)
          .eq('is_critical', true); // Only critical calendar events for top chart

        if (!calendarError && calendarData) {
          // Get project and company info for calendar events
          const projectIds = [...new Set(calendarData.map(event => event.project_id))];
          const { data: calProjects } = await supabase
            .from('projects')
            .select(`id, name, company_id`)
            .in('id', projectIds);
          const calProjectMap = new Map((calProjects || []).map(p => [p.id, p]));

          const calCompanyIds = [...new Set((calProjects || []).map(p => p.company_id).filter(Boolean))] as string[];
          let calCompaniesMap = new Map<string, { id: string; name: string }>();
          if (calCompanyIds.length > 0) {
            const { data: calCompanies } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', calCompanyIds);
            calCompaniesMap = new Map((calCompanies || []).map(c => [c.id, c]));
          }
          
          calendarData.forEach(event => {
          const project = calProjectMap.get(event.project_id);
          const company = project && project.company_id ? calCompaniesMap.get(project.company_id) : null;
            
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
                project_id: event.project_id,
                project: {
                  name: project?.name || 'Unknown Project',
                  company: { name: company?.name || 'Unknown Company' }
                }
              });
              currentDate.setDate(currentDate.getDate() + 1);
            }
          });
        }

        // Fetch all calendar events within range (not just critical)
        const { data: allCalendarData, error: allCalendarError } = await supabase
          .from('project_events')
          .select(`
            id,
            title,
            start_date,
            end_date,
            is_critical,
            project_id
          `)
          .or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`);

        const allCalendarEventsArray: UpcomingEvent[] = [];

        if (!allCalendarError && allCalendarData) {
          // Get project and company info for all calendar events
          const allProjectIds = [...new Set(allCalendarData.map(event => event.project_id))];
          const { data: allProjectsData } = await supabase
            .from('projects')
            .select(`id, name, company_id`)
            .in('id', allProjectIds);
          
          const allProjectMap = new Map((allProjectsData || []).map(p => [p.id, p]));

          const allCompanyIds = [...new Set((allProjectsData || []).map(p => p.company_id).filter(Boolean))] as string[];
          let allCompaniesMap = new Map<string, { id: string; name: string }>();
          if (allCompanyIds.length > 0) {
            const { data: allCompanies } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', allCompanyIds);
            allCompaniesMap = new Map((allCompanies || []).map(c => [c.id, c]));
          }
          
          allCalendarData.forEach(event => {
            const project = allProjectMap.get(event.project_id);
            const company = project && project.company_id ? allCompaniesMap.get(project.company_id) : null;
            
            // For multi-day events, add for each day in range
            const eventStart = new Date(event.start_date);
            const eventEnd = new Date(event.end_date);
            const rangeStart = new Date(startDate);
            const rangeEnd = new Date(endDate);
            
            const currentDate = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));
            const endDateToCheck = new Date(Math.min(eventEnd.getTime(), rangeEnd.getTime()));
            
            while (currentDate <= endDateToCheck) {
              allCalendarEventsArray.push({
                id: `calendar-${event.id}-${currentDate.toISOString().split('T')[0]}`,
                title: event.title,
                date: currentDate.toISOString().split('T')[0],
                type: 'calendar',
                is_critical: event.is_critical,
                project_id: event.project_id,
                project: {
                  name: project?.name || 'Unknown Project',
                  company: { name: company?.name || 'Unknown Company' }
                }
              });
              currentDate.setDate(currentDate.getDate() + 1);
            }
          });
        }

        // Finalize events
        if (allEvents.length === 0) {
          console.warn('No critical events built from detailed pipeline, attempting simplified fallback queries');
          try {
            const { data: simpleActions } = await supabase
              .from('actions')
              .select('id, title, planned_date, status')
              .eq('is_critical', true)
              .gte('planned_date', startDate)
              .lte('planned_date', endDate)
              .neq('status', 'Done');
            (simpleActions || []).forEach(a => {
              allEvents.push({
                id: `action-${a.id}`,
                title: a.title,
                date: a.planned_date as string,
                type: 'action',
                status: a.status,
                project: { name: 'Unknown Project', company: { name: 'Unknown Company' } }
              });
            });

            const { data: simpleCal } = await supabase
              .from('project_events')
              .select('id, title, start_date, end_date, is_critical, project_id')
              .eq('is_critical', true)
              .or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`);
            (simpleCal || []).forEach(ev => {
              const eventStart = new Date(ev.start_date);
              const eventEnd = new Date(ev.end_date);
              const rangeStart = new Date(startDate);
              const rangeEnd = new Date(endDate);
              const currentDate = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));
              const endDateToCheck = new Date(Math.min(eventEnd.getTime(), rangeEnd.getTime()));
              while (currentDate <= endDateToCheck) {
                allEvents.push({
                  id: `calendar-${ev.id}-${currentDate.toISOString().split('T')[0]}`,
                  title: ev.title,
                  date: currentDate.toISOString().split('T')[0],
                  type: 'calendar',
                  is_critical: ev.is_critical,
                  project_id: ev.project_id,
                  project: { name: 'Unknown Project', company: { name: 'Unknown Company' } }
                });
                currentDate.setDate(currentDate.getDate() + 1);
              }
            });
          } catch (e) {
            console.warn('Fallback queries failed:', e);
          }
        }

        setEvents(allEvents);
        setAllCalendarEvents(allCalendarEventsArray);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
  
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh data every 30 seconds to catch updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const getAllCalendarEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allCalendarEvents.filter(event => event.date === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleEventDoubleClick = (event: UpcomingEvent) => {
    if (event.type === 'task' && event.project_id && event.task_id) {
      // Navigate to project with tasks tab and highlight the specific task
      navigate(`/app/projects/${event.project_id}?tab=tasks&highlightTask=${event.task_id}`);
    } else if (event.type === 'action') {
      // Extract action ID from the event id (format: action-{actionId})
      const actionId = event.id.replace('action-', '');
      // Navigate to actions page and scroll to the specific action
      navigate(`/app/actions?highlightAction=${actionId}`);
    } else if (event.type === 'calendar' && event.project_id) {
      // Extract event ID from the event id (format: calendar-{fullEventId}-{YYYY-MM-DD})
      // Remove 'calendar-' prefix and '-YYYY-MM-DD' suffix
      const withoutPrefix = event.id.replace('calendar-', '');
      // Remove the last 3 parts (YYYY-MM-DD) from the end
      const parts = withoutPrefix.split('-');
      const eventId = parts.slice(0, -3).join('-'); // Remove last 3 parts (YYYY, MM, DD)
      // Navigate to project with calendar tab and highlight the specific event
      navigate(`/app/projects/${event.project_id}?tab=calendar&highlightEvent=${eventId}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Global Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Global Dashboard</h1>
        <p className="text-muted-foreground">
          Client overview and upcoming events
        </p>
      </div>
      
      {/* Implementation Blockers */}
      {profile?.is_internal && (
        <BlockersDashboardCard />
      )}

      {/* 7-Day Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Critical Events</CardTitle>
          <CardDescription>Critical tasks, actions, and events for the next 7 days</CardDescription>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border-2 border-amber-700 rounded"></div>
              <span className="text-xs text-muted-foreground">📋 Critical Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-50 border-2 border-slate-500 rounded"></div>
              <span className="text-xs text-muted-foreground">⚡ Critical Actions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-50 border-2 border-black rounded"></div>
              <span className="text-xs text-muted-foreground">📅 Critical Events</span>
            </div>
          </div>
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
                        if (event.type === 'task') {
                          return 'bg-orange-50 text-orange-800 border-2 border-amber-700'; // Brown border for critical tasks
                        } else if (event.type === 'action') {
                          return 'bg-slate-50 text-slate-800 border-2 border-slate-500'; // Grey border for critical actions
                        } else if (event.type === 'calendar') {
                          return 'bg-slate-50 text-slate-900 border-2 border-black'; // Dark black border for critical events
                        }
                        return 'bg-primary/10 text-primary border border-primary/20';
                      };

                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors hover:opacity-80 ${getEventColor()}`}
                          onDoubleClick={() => handleEventDoubleClick(event)}
                          title={`${event.title}\n${event.project.company.name}: ${event.project.name}\n\nDouble-click to navigate`}
                        >
                          <div className="flex flex-col">
                            <div className="font-medium truncate mb-1" title={event.title}>
                              {event.title.length > 20 ? `${event.title.slice(0, 20)}...` : event.title}
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-xs opacity-75 truncate flex-1" title={event.project.name}>
                                {event.project.name.length > 12 ? `${event.project.name.slice(0, 12)}...` : event.project.name}
                              </div>
                              <div className="text-xs opacity-60 ml-1">
                                {event.type === 'task' ? '📋' : event.type === 'action' ? '⚡' : '📅'}
                              </div>
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

      {/* Implementation Projects Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Projects</CardTitle>
          <CardDescription>Current implementation projects with health and status indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  <div className="flex items-center gap-2">
                    {/* Health Icon */}
                    {project.customer_health === 'green' && (
                      <div title="Customer Health: Green">
                        <Smile className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                    {project.customer_health === 'red' && (
                      <div title="Customer Health: Red">
                        <Frown className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                    
                    {/* Project Status Icon */}
                    {project.project_status === 'on_track' && (
                      <div title="Project Status: On Track">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                    {project.project_status === 'off_track' && (
                      <div title="Project Status: Off Track">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{project.company_name}</p>
                  <Badge variant="outline" className="text-xs">
                    {project.domain}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {projects.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No implementation projects found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;