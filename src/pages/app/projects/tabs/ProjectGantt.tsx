import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { BarChart } from 'lucide-react';

interface Task {
  id: string;
  step_name: string;
  task_title: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  subtasks?: Subtask[];
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
}

interface ProjectEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_critical: boolean;
  attendees: EventAttendee[];
}

interface EventAttendee {
  id: string;
  user_id: string;
  profiles?: {
    name: string | null;
  } | null;
}

interface ProjectGanttProps {
  projectId: string;
}

const ProjectGantt = ({ projectId }: ProjectGanttProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasksSubtasksAndEvents();
  }, [projectId]);

  const fetchTasksSubtasksAndEvents = async () => {
    try {
      console.log('ProjectGantt: Starting to fetch tasks, subtasks, and events for project:', projectId);
      setLoading(true);
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('project_tasks')
        .select('id, step_name, task_title, planned_start, planned_end, actual_start, actual_end, status')
        .eq('project_id', projectId)
        .order('planned_start');

      if (tasksError) throw tasksError;

      // Fetch subtasks for all tasks
      const taskIds = (tasksData || []).map(task => task.id);
      let subtasksData: Subtask[] = [];
      
      if (taskIds.length > 0) {
        const { data: subtasksResponse, error: subtasksError } = await supabase
          .from('subtasks')
          .select('id, task_id, title, planned_start, planned_end, actual_start, actual_end, status')
          .in('task_id', taskIds)
          .order('task_id, planned_start');

        if (subtasksError) throw subtasksError;
        subtasksData = subtasksResponse || [];
      }

      // Fetch calendar events
      const { data: eventsData, error: eventsError } = await supabase
        .from('project_events')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date');

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
      }

      // Fetch attendees for events
      const eventsWithAttendees = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: attendeesData, error: attendeesError } = await supabase
            .from('event_attendees')
            .select('id, user_id')
            .eq('event_id', event.id);

          if (attendeesError) {
            console.error('Error fetching attendees for event:', event.id, attendeesError);
            return { ...event, attendees: [] };
          }

          // Fetch profile names separately
          const attendeesWithProfiles = await Promise.all(
            (attendeesData || []).map(async (attendee) => {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('name')
                .eq('user_id', attendee.user_id)
                .single();

              return {
                ...attendee,
                profiles: profileData || null
              };
            })
          );

          return { ...event, attendees: attendeesWithProfiles };
        })
      );

      console.log('ProjectGantt: Query response:', { tasksData, subtasksData, eventsData: eventsWithAttendees });

      setTasks(tasksData || []);
      setSubtasks(subtasksData);
      setEvents(eventsWithAttendees);
    } catch (error: any) {
      console.error('ProjectGantt: Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data for Gantt chart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getItemColor = (item: Task | Subtask): string => {
    if (!item.planned_end) return '#e5e7eb'; // gray for no planned date
    
    const plannedEnd = new Date(item.planned_end);
    const today = new Date();
    const actualEnd = item.actual_end ? new Date(item.actual_end) : null;

    if (actualEnd) {
      // Item is completed
      return actualEnd <= plannedEnd ? '#10b981' : '#ef4444'; // green if on time, red if late
    } else {
      // Item is not completed
      return today > plannedEnd ? '#fca5a5' : '#d1d5db'; // pale red if overdue, gray if on track
    }
  };

  const getItemWidth = (item: Task | Subtask): number => {
    if (!item.planned_start || !item.planned_end) return 20; // minimum width
    
    const start = new Date(item.planned_start);
    const end = new Date(item.planned_end);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    return Math.max(20, duration * 10); // 10px per day, minimum 20px
  };

  const getItemPosition = (item: Task | Subtask, allItems: (Task | Subtask | ProjectEvent)[]): number => {
    if (!item.planned_start) return 0;
    
    const start = new Date(item.planned_start);
    const projectStart = allItems.reduce((earliest, i) => {
      let itemStart: Date | null = null;
      
      if ('planned_start' in i && i.planned_start) {
        itemStart = new Date(i.planned_start);
      } else if ('start_date' in i) {
        itemStart = new Date(i.start_date);
      }
      
      if (!itemStart) return earliest;
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10); // 10px per day
  };

  // Helper function for event bars
  const getEventColor = (event: ProjectEvent): string => {
    return event.is_critical ? '#ef4444' : '#8b5cf6'; // Red for critical events, purple for others
  };

  const getEventWidth = (event: ProjectEvent): number => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) + 1; // +1 to include both start and end dates
    
    return Math.max(20, duration * 10); // 10px per day, minimum 20px
  };

  const getEventPosition = (event: ProjectEvent, allItems: (Task | Subtask | ProjectEvent)[]): number => {
    const start = new Date(event.start_date);
    const projectStart = allItems.reduce((earliest, i) => {
      let itemStart: Date | null = null;
      
      if ('planned_start' in i && i.planned_start) {
        itemStart = new Date(i.planned_start);
      } else if ('start_date' in i) {
        itemStart = new Date(i.start_date);
      }
      
      if (!itemStart) return earliest;
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10); // 10px per day
  };

  // Helper function to get today's position
  const getTodayPosition = (allItems: (Task | Subtask | ProjectEvent)[]): number => {
    const today = new Date();
    const projectStart = allItems.reduce((earliest, i) => {
      let itemStart: Date | null = null;
      
      if ('planned_start' in i && i.planned_start) {
        itemStart = new Date(i.planned_start);
      } else if ('start_date' in i) {
        itemStart = new Date(i.start_date);
      }
      
      if (!itemStart) return earliest;
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10); // 10px per day
  };

  // Helper function to generate date markers for x-axis
  const generateDateMarkers = (allItems: (Task | Subtask | ProjectEvent)[]) => {
    if (allItems.length === 0) return [];

    const projectStart = allItems.reduce((earliest, i) => {
      let itemStart: Date | null = null;
      
      if ('planned_start' in i && i.planned_start) {
        itemStart = new Date(i.planned_start);
      } else if ('start_date' in i) {
        itemStart = new Date(i.start_date);
      }
      
      if (!itemStart) return earliest;
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);

    const projectEnd = allItems.reduce((latest, i) => {
      let itemEnd: Date | null = null;
      
      if ('planned_end' in i && i.planned_end) {
        itemEnd = new Date(i.planned_end);
      } else if ('end_date' in i) {
        itemEnd = new Date(i.end_date);
      }
      
      if (!itemEnd) return latest;
      return !latest || itemEnd > latest ? itemEnd : latest;
    }, null as Date | null);

    if (!projectStart || !projectEnd) return [];

    const markers = [];
    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine interval based on project duration
    let interval = 7; // weekly by default
    if (totalDays > 180) interval = 30; // monthly for long projects
    if (totalDays < 30) interval = 3; // every 3 days for short projects

    for (let day = 0; day <= totalDays; day += interval) {
      const date = new Date(projectStart);
      date.setDate(date.getDate() + day);
      
      markers.push({
        date: date,
        position: day * 10, // 10px per day
        label: formatDateUK(date.toISOString().split('T')[0])
      });
    }

    return markers;
  };

  // Create combined list for positioning calculation
  const allItems: (Task | Subtask | ProjectEvent)[] = [
    ...tasks,
    ...subtasks,
    ...events
  ];
  
  const tasksWithDates = tasks.filter(task => task.planned_start && task.planned_end);
  const todayPosition = getTodayPosition(allItems);
  const dateMarkers = generateDateMarkers(allItems);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-4 w-4" />
          Project Gantt Chart
        </CardTitle>
        <CardDescription>
          Visual timeline showing planned vs actual task completion and calendar events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasksWithDates.length === 0 && events.length === 0 ? (
          <div className="text-center py-8">
            <BarChart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No tasks or events with dates found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Completed on time</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Completed late</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span>Overdue (not completed)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span>On track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>Calendar Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Critical Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-red-500"></div>
                <span>Today</span>
              </div>
            </div>

            {/* Calendar Events Section */}
            {events.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-200 pb-2">
                  📅 Calendar Events
                </h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] space-y-2 relative">
                    {/* X-axis date labels for events */}
                    <div className="relative h-8 border-b border-gray-200">
                      <div className="absolute inset-0" style={{ marginLeft: '264px' }}>
                        {dateMarkers.map((marker, index) => (
                          <div
                            key={index}
                            className="absolute text-xs text-gray-600 transform -rotate-45 origin-bottom-left"
                            style={{
                              left: `${marker.position}px`,
                              bottom: '4px'
                            }}
                          >
                            {marker.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Today line for events */}
                    <div
                      className="absolute top-8 bottom-0 w-0.5 bg-red-500 z-10 opacity-80"
                      style={{
                        left: `${264 + todayPosition}px` // 264px is the width of the info column
                      }}
                    >
                      <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Today ({formatDateUK(new Date().toISOString().split('T')[0])})
                      </div>
                    </div>
                    {events.map((event) => (
                      <div key={event.id} className="flex items-center gap-4 py-2 bg-purple-50 rounded-lg">
                        {/* Event Info */}
                        <div className="w-64 flex-shrink-0 px-2">
                          <div className="text-sm font-medium truncate text-purple-900">{event.title}</div>
                          {event.description && (
                            <div className="text-xs text-purple-700 truncate">{event.description}</div>
                          )}
                          <div className="text-xs text-purple-600">
                            {formatDateUK(event.start_date)}
                            {event.start_date !== event.end_date && ` - ${formatDateUK(event.end_date)}`}
                          </div>
                          {event.attendees.length > 0 && (
                            <div className="text-xs text-purple-600 truncate">
                              👥 {event.attendees.map(a => a.profiles?.name || 'Unknown').join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Event Gantt Bar */}
                        <div className="flex-1 relative h-8 bg-purple-100 rounded">
                          <div
                            className="absolute top-1 h-6 rounded flex items-center justify-center text-xs text-white font-medium shadow-sm"
                            style={{
                              left: `${getEventPosition(event, allItems)}px`,
                              width: `${getEventWidth(event)}px`,
                              backgroundColor: getEventColor(event),
                              minWidth: '20px'
                            }}
                          >
                            📅
                          </div>
                        </div>

                        {/* Event Type */}
                        <div className="w-20 flex-shrink-0 text-xs">
                          <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">
                            Event
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {tasksWithDates.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-700 border-b border-blue-200 pb-2">
                  🔧 Project Tasks
                </h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] space-y-2 relative">
                    {/* X-axis date labels for tasks */}
                    <div className="relative h-8 border-b border-gray-200">
                      <div className="absolute inset-0" style={{ marginLeft: '264px' }}>
                        {dateMarkers.map((marker, index) => (
                          <div
                            key={index}
                            className="absolute text-xs text-gray-600 transform -rotate-45 origin-bottom-left"
                            style={{
                              left: `${marker.position}px`,
                              bottom: '4px'
                            }}
                          >
                            {marker.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Today line for tasks */}
                    <div
                      className="absolute top-8 bottom-0 w-0.5 bg-red-500 z-10 opacity-80"
                      style={{
                        left: `${264 + todayPosition}px` // 264px is the width of the info column
                      }}
                    >
                      <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Today ({formatDateUK(new Date().toISOString().split('T')[0])})
                      </div>
                    </div>
                    {tasksWithDates.map((task) => {
                      const taskSubtasks = subtasks.filter(st => st.task_id === task.id && st.planned_start && st.planned_end);
                      
                      return (
                        <div key={task.id} className="space-y-1">
                          {/* Main Task */}
                          <div className="flex items-center gap-4 py-2">
                            {/* Task Info */}
                            <div className="w-64 flex-shrink-0">
                              <div className="text-sm font-medium truncate flex items-center gap-2">
                                {task.task_title}
                              </div>
                              <div className="text-xs text-muted-foreground">{task.step_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {task.planned_start && task.planned_end && (
                                  <>
                                    {formatDateUK(task.planned_start)} - {formatDateUK(task.planned_end)}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Gantt Bar */}
                            <div className="flex-1 relative h-8 bg-gray-100 rounded">
                              <div
                                className="absolute top-1 h-6 rounded flex items-center justify-center text-xs text-white font-medium"
                                style={{
                                  left: `${getItemPosition(task, allItems)}px`,
                                  width: `${getItemWidth(task)}px`,
                                  backgroundColor: getItemColor(task),
                                  minWidth: '20px'
                                }}
                              >
                                {task.status === 'Done' && '✓'}
                              </div>

                              {/* Actual bar (if different from planned) */}
                              {task.actual_start && task.actual_end && (
                                <div
                                  className="absolute bottom-1 h-2 bg-blue-600 rounded opacity-70"
                                  style={{
                                    left: `${getItemPosition({ ...task, planned_start: task.actual_start }, allItems)}px`,
                                    width: `${getItemWidth({ ...task, planned_start: task.actual_start, planned_end: task.actual_end })}px`,
                                    minWidth: '4px'
                                  }}
                                />
                              )}
                            </div>

                            {/* Status */}
                            <div className="w-20 flex-shrink-0 text-xs">
                              <span className={`px-2 py-1 rounded ${
                                task.status === 'Done' ? 'bg-green-100 text-green-700' :
                                task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                task.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          </div>

                          {/* Subtasks */}
                          {taskSubtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-4 py-1 ml-4">
                              {/* Subtask Info */}
                              <div className="w-64 flex-shrink-0">
                                <div className="text-xs font-medium truncate text-muted-foreground">
                                  ├─ {subtask.title}
                                </div>
                                <div className="text-xs text-muted-foreground ml-3">
                                  {subtask.planned_start && subtask.planned_end && (
                                    <>
                                      {formatDateUK(subtask.planned_start)} - {formatDateUK(subtask.planned_end)}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Subtask Gantt Bar */}
                              <div className="flex-1 relative h-6 bg-gray-50 rounded">
                                <div
                                  className="absolute top-1 h-4 rounded flex items-center justify-center text-xs text-white font-medium"
                                  style={{
                                    left: `${getItemPosition(subtask, allItems)}px`,
                                    width: `${getItemWidth(subtask)}px`,
                                    backgroundColor: getItemColor(subtask),
                                    minWidth: '15px',
                                    opacity: 0.8
                                  }}
                                >
                                  {subtask.status === 'Done' && '✓'}
                                </div>

                                {/* Actual bar for subtask */}
                                {subtask.actual_start && subtask.actual_end && (
                                  <div
                                    className="absolute bottom-1 h-1 bg-blue-600 rounded opacity-70"
                                    style={{
                                      left: `${getItemPosition({ ...subtask, planned_start: subtask.actual_start }, allItems)}px`,
                                      width: `${getItemWidth({ ...subtask, planned_start: subtask.actual_start, planned_end: subtask.actual_end })}px`,
                                      minWidth: '3px'
                                    }}
                                  />
                                )}
                              </div>

                              {/* Subtask Status */}
                              <div className="w-20 flex-shrink-0 text-xs">
                                <span className={`px-1 py-0.5 rounded text-xs ${
                                  subtask.status === 'Done' ? 'bg-green-100 text-green-700' :
                                  subtask.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                  subtask.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {subtask.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Print Instructions */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p><strong>Print/Export:</strong> Use your browser's print function (Ctrl+P) to print or save as PDF.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectGantt;