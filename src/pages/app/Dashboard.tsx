import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateUK } from '@/lib/dateUtils';
import { useNavigate } from 'react-router-dom';

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
  const [companies, setCompanies] = useState<Company[]>([]);
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

        if (companiesError) {
          console.warn('Companies query failed, continuing without company counts:', companiesError);
        }

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

        // Fetch critical tasks with planned dates within range (only blocked tasks)
        const { data: tasksData, error: tasksError } = await supabase
          .from('project_tasks')
          .select(`
            id,
            task_title,
            planned_start,
            planned_end,
            status,
            project_id
          `)
.or(`and(planned_start.gte.${startDate},planned_start.lte.${endDate}),and(planned_end.gte.${startDate},planned_end.lte.${endDate})`)
          .in('status', ['Blocked', 'In Progress', 'Planned']);

        if (!tasksError && tasksData) {
          // Build project/company maps for tasks
          const taskProjectIds = [...new Set((tasksData || []).map(t => t.project_id))] as string[];
          let taskProjectsMap = new Map<string, { id: string; name: string; company_id: string | null }>();
          let taskCompaniesMap = new Map<string, { id: string; name: string }>();

          if (taskProjectIds.length > 0) {
            const { data: tProjects, error: tProjError } = await supabase
              .from('projects')
              .select('id, name, company_id')
              .in('id', taskProjectIds);
            if (!tProjError && tProjects) {
              taskProjectsMap = new Map((tProjects as any[]).map(p => [p.id, p]));
              const tCompanyIds = [...new Set((tProjects as any[]).map(p => p.company_id).filter(Boolean))] as string[];
              if (tCompanyIds.length > 0) {
                const { data: tCompanies } = await supabase
                  .from('companies')
                  .select('id, name')
                  .in('id', tCompanyIds);
                taskCompaniesMap = new Map((tCompanies as any[] || []).map(c => [c.id, c]));
              }
            }
          }

          tasksData.forEach(task => {
            const project = taskProjectsMap.get(task.project_id);
            const company = project?.company_id ? taskCompaniesMap.get(project.company_id) : null;

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
                  name: project?.name || 'Unknown Project',
                  company: { name: company?.name || 'Unknown Company' }
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
                  name: project?.name || 'Unknown Project',
                  company: { name: company?.name || 'Unknown Company' }
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
          .eq('is_critical', true);

        if (actionsError) throw actionsError;

        const actionsWithTasksOnly = (actionsData || []).filter(a => a.project_task_id);
        const actionsWithoutTasksOnly = (actionsData || []).filter(a => !a.project_task_id && a.project_id);

        // Fetch related project_tasks for actions with tasks
        const projectTaskIds = [...new Set(actionsWithTasksOnly.map(a => a.project_task_id))] as string[];
        let projectTasksMap = new Map<string, { id: string; project_id: string }>();
        if (projectTaskIds.length > 0) {
          const { data: projectTasksData, error: projectTasksError } = await supabase
            .from('project_tasks')
            .select('id, project_id')
            .in('id', projectTaskIds);
          if (projectTasksError) throw projectTasksError;
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
          if (projectsError) throw projectsError;
          projectsMap = new Map((projectsData || []).map(p => [p.id, p as any]));

          const companyIds = [...new Set((projectsData || []).map(p => p.company_id).filter(Boolean))] as string[];
          if (companyIds.length > 0) {
            const { data: companiesData, error: companiesError } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', companyIds);
            if (companiesError) throw companiesError;
            companiesMap = new Map((companiesData || []).map(c => [c.id, c as any]));
          }
        }

        // Process actions with tasks
        actionsWithTasksOnly.forEach(action => {
          const pt = projectTasksMap.get(action.project_task_id as string);
          if (!pt) return;
          const project = projectsMap.get(pt.project_id);
          if (!project) return;
          const company = project.company_id ? companiesMap.get(project.company_id) : null;

          allEvents.push({
            id: `action-${action.id}`,
            title: action.title,
            date: action.planned_date as string,
            type: 'action',
            status: action.status,
            is_critical: action.is_critical,
            project_id: pt.project_id,
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
.or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`)
          .eq('is_critical', true); // Only critical calendar events

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
            if (!project) return;
            const company = project.company_id ? calCompaniesMap.get(project.company_id) : null;
            
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
                  name: project.name,
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
            if (!project) return;
            const company = project.company_id ? allCompaniesMap.get(project.company_id) : null;
            
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
                  name: project.name,
                  company: { name: company?.name || 'Unknown Company' }
                }
              });
              currentDate.setDate(currentDate.getDate() + 1);
            }
          });
        }

        setEvents(allEvents);
        setAllCalendarEvents(allCalendarEventsArray);
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
                          className={`text-xs p-1 rounded text-left cursor-pointer ${getEventColor()}`}
                          onDoubleClick={() => handleEventDoubleClick(event)}
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

      {/* All Calendar Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Calendar Events</CardTitle>
          <CardDescription>All project calendar events for the next 7 days</CardDescription>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-600 rounded"></div>
              <span className="text-xs text-muted-foreground">📅 Critical Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-500 rounded"></div>
              <span className="text-xs text-muted-foreground">📅 Regular Events</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dateRange.map((date, index) => {
              const dayCalendarEvents = getAllCalendarEventsForDate(date);
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
                    {dayCalendarEvents.map((event) => {
                      const getEventColor = () => {
                        if (event.is_critical) {
                          return 'bg-red-50 text-red-800 border-2 border-red-600'; // Red border for critical events
                        } else {
                          return 'bg-blue-50 text-blue-800 border-2 border-blue-500'; // Blue border for regular events
                        }
                      };

                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded text-left cursor-pointer ${getEventColor()}`}
                          onDoubleClick={() => handleEventDoubleClick(event)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]">📅</span>
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