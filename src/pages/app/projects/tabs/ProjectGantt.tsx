import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { BarChart, List, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface StepGroup {
  step_name: string;
  tasks: Task[];
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
}

type ViewMode = 'step' | 'task';

interface ProjectGanttProps {
  projectId: string;
}

const ProjectGantt = ({ projectId }: ProjectGanttProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('task');

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

  const getItemColor = (item: Task | Subtask | StepGroup): string => {
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

  const getItemWidth = (item: Task | Subtask | StepGroup): number => {
    if (!item.planned_start || !item.planned_end) return 20; // minimum width
    
    const start = new Date(item.planned_start);
    const end = new Date(item.planned_end);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    return Math.max(20, duration * 10); // 10px per day, minimum 20px
  };

  const getItemPosition = (item: Task | Subtask | StepGroup, allItems: (Task | Subtask | ProjectEvent | StepGroup)[]): number => {
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

  const getEventPosition = (event: ProjectEvent, allItems: (Task | Subtask | ProjectEvent | StepGroup)[]): number => {
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
  const getTodayPosition = (allItems: (Task | Subtask | ProjectEvent | StepGroup)[]): number => {
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
  const generateDateMarkers = (allItems: (Task | Subtask | ProjectEvent | StepGroup)[]) => {
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

  // Group tasks by step
  const groupTasksByStep = (tasks: Task[]): StepGroup[] => {
    const stepGroups: Record<string, StepGroup> = {};
    
    tasks.forEach(task => {
      const stepName = task.step_name || 'Unknown Step';
      
      if (!stepGroups[stepName]) {
        stepGroups[stepName] = {
          step_name: stepName,
          tasks: [],
          planned_start: null,
          planned_end: null,
          actual_start: null,
          actual_end: null,
          status: 'Planning'
        };
      }
      
      stepGroups[stepName].tasks.push(task);
      
      // Calculate step dates based on task dates
      if (task.planned_start) {
        if (!stepGroups[stepName].planned_start || task.planned_start < stepGroups[stepName].planned_start!) {
          stepGroups[stepName].planned_start = task.planned_start;
        }
      }
      
      if (task.planned_end) {
        if (!stepGroups[stepName].planned_end || task.planned_end > stepGroups[stepName].planned_end!) {
          stepGroups[stepName].planned_end = task.planned_end;
        }
      }
      
      if (task.actual_start) {
        if (!stepGroups[stepName].actual_start || task.actual_start < stepGroups[stepName].actual_start!) {
          stepGroups[stepName].actual_start = task.actual_start;
        }
      }
      
      if (task.actual_end) {
        if (!stepGroups[stepName].actual_end || task.actual_end > stepGroups[stepName].actual_end!) {
          stepGroups[stepName].actual_end = task.actual_end;
        }
      }
    });
    
    // Determine step status based on task statuses
    Object.values(stepGroups).forEach(step => {
      const taskStatuses = step.tasks.map(t => t.status);
      if (taskStatuses.every(s => s === 'Done')) {
        step.status = 'Done';
      } else if (taskStatuses.some(s => s === 'In Progress')) {
        step.status = 'In Progress';
      } else if (taskStatuses.some(s => s === 'Blocked')) {
        step.status = 'Blocked';
      } else {
        step.status = 'Planning';
      }
    });
    
    return Object.values(stepGroups);
  };

  // Create combined list for positioning calculation
  const tasksWithDates = tasks.filter(task => task.planned_start && task.planned_end);
  const stepGroups = groupTasksByStep(tasksWithDates);
  const stepsWithDates = stepGroups.filter(step => step.planned_start && step.planned_end);
  
  const allItems: (Task | Subtask | ProjectEvent | StepGroup)[] = [
    ...(viewMode === 'step' ? stepsWithDates : tasksWithDates),
    ...subtasks,
    ...events
  ];
  
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Project Gantt Chart
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'step' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('step')}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Step View
            </Button>
            <Button
              variant={viewMode === 'task' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('task')}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              Task View
            </Button>
          </div>
        </div>
        <CardDescription>
          Visual timeline showing planned vs actual {viewMode === 'step' ? 'step' : 'task'} completion and calendar events
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3">
        {(viewMode === 'step' ? stepsWithDates.length === 0 : tasksWithDates.length === 0) && events.length === 0 ? (
          <div className="text-center py-4">
            <BarChart className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No {viewMode === 'step' ? 'steps' : 'tasks'} or events with dates found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact Legend */}
            <div className="flex flex-wrap gap-3 text-xs bg-muted/30 p-2 rounded-md">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span>On time</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-200 rounded-sm"></div>
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
                <span>On track</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                <span>Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-0.5 h-3 bg-red-500"></div>
                <span>Today</span>
              </div>
            </div>

            {/* Calendar Events Section */}
            {events.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-purple-700 border-b border-purple-200/50 pb-1">
                  📅 Events
                </h3>
                <div className="relative">
                  {/* Sticky header for events */}
                  <div className="sticky top-0 z-30 bg-background border-b border-gray-200">
                    <div className="flex">
                      <div className="sticky left-0 z-40 bg-background w-60 h-6 border-r border-gray-200"></div>
                      <div className="relative h-6 overflow-hidden">
                        <div className="flex">
                          {dateMarkers.map((marker, index) => (
                            <div
                              key={index}
                              className="absolute text-[10px] text-gray-600 transform -rotate-45 origin-bottom-left whitespace-nowrap"
                              style={{
                                left: `${marker.position}px`,
                                bottom: '2px'
                              }}
                            >
                              {marker.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-auto max-h-96">
                    <div className="min-w-full space-y-1 relative">
                    
                    {/* Compact Today line for events */}
                    <div
                      className="absolute top-6 bottom-0 w-0.5 bg-red-500 z-10 opacity-80"
                      style={{
                        left: `${240 + todayPosition}px` // 240px is the new compact width
                      }}
                    >
                      <div className="absolute -top-5 -left-6 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded whitespace-nowrap">
                        Today
                      </div>
                    </div>
                      {events.map((event) => (
                        <div key={event.id} className="flex items-center gap-2 py-1 bg-purple-50/50 rounded">
                          {/* Sticky Event Info */}
                          <div className="sticky left-0 z-30 bg-purple-50/50 w-60 flex-shrink-0 px-1 border-r border-gray-100">
                            <div className="text-xs font-medium truncate text-purple-900">{event.title}</div>
                            <div className="text-[10px] text-purple-600">
                              {formatDateUK(event.start_date)}
                              {event.start_date !== event.end_date && ` - ${formatDateUK(event.end_date)}`}
                            </div>
                          </div>

                          {/* Event Gantt Bar */}
                          <div className="flex-1 relative h-4 bg-purple-100/50 rounded">
                            <div
                              className="absolute top-0.5 h-3 rounded flex items-center justify-center text-[10px] text-white font-medium"
                              style={{
                                left: `${getEventPosition(event, allItems)}px`,
                                width: `${getEventWidth(event)}px`,
                                backgroundColor: getEventColor(event),
                                minWidth: '15px'
                              }}
                            >
                              📅
                            </div>
                          </div>
                        </div>
                      ))}
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks/Steps Section */}
            {(viewMode === 'step' ? stepsWithDates.length > 0 : tasksWithDates.length > 0) && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-blue-700 border-b border-blue-200/50 pb-1">
                  🔧 {viewMode === 'step' ? 'Steps' : 'Tasks'}
                </h3>
                <div className="relative">
                  {/* Sticky header for tasks */}
                  <div className="sticky top-0 z-30 bg-background border-b border-gray-200">
                    <div className="flex">
                      <div className="sticky left-0 z-40 bg-background w-60 h-6 border-r border-gray-200"></div>
                      <div className="relative h-6 overflow-hidden">
                        <div className="flex">
                          {dateMarkers.map((marker, index) => (
                            <div
                              key={index}
                              className="absolute text-[10px] text-gray-600 transform -rotate-45 origin-bottom-left whitespace-nowrap"
                              style={{
                                left: `${marker.position}px`,
                                bottom: '2px'
                              }}
                            >
                              {marker.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-auto max-h-96">
                    <div className="min-w-full space-y-1 relative">
                    
                      {/* Today line for tasks */}
                      <div 
                        className="absolute w-0.5 bg-red-500 z-20"
                        style={{ 
                          left: `${240 + todayPosition}px`, 
                          top: '0px',
                          height: '100%'
                        }}
                      />
                    {viewMode === 'step' ? (
                      // Step View
                      stepsWithDates.map((step) => (
                        <div key={step.step_name} className="space-y-1">
                           {/* Step */}
                           <div className="flex items-center gap-2 py-1 bg-blue-50/50 rounded">
                             {/* Sticky Step Info */}
                             <div className="sticky left-0 z-30 bg-blue-50/50 w-60 flex-shrink-0 px-1 border-r border-gray-100">
                               <div className="text-xs font-medium truncate">
                                 {step.step_name}
                               </div>
                               <div className="text-[10px] text-muted-foreground">
                                 {step.tasks.length} task{step.tasks.length !== 1 ? 's' : ''} | Status: 
                                 <span className={`ml-1 px-1 py-0.5 rounded ${
                                   step.status === 'Done' ? 'bg-green-100 text-green-700' :
                                   step.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                   step.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                                   'bg-gray-100 text-gray-700'
                                 }`}>
                                   {step.status}
                                 </span>
                               </div>
                               <div className="text-[10px] text-muted-foreground">
                                 {step.planned_start && step.planned_end && (
                                   <>
                                     {formatDateUK(step.planned_start)} - {formatDateUK(step.planned_end)}
                                   </>
                                 )}
                               </div>
                             </div>

                             {/* Compact Gantt Bar */}
                             <div className="flex-1 relative h-4 bg-gray-100/50 rounded">
                               <div
                                 className="absolute top-0.5 h-3 rounded"
                                 style={{
                                   left: `${getItemPosition(step as any, allItems)}px`,
                                   width: `${getItemWidth(step as any)}px`,
                                   backgroundColor: getItemColor(step as any),
                                   minWidth: '15px'
                                 }}
                               >
                               </div>

                               {/* Compact Actual bar */}
                               {step.actual_start && step.actual_end && (
                                 <div
                                   className="absolute bottom-0.5 h-1 bg-blue-600 rounded opacity-70"
                                   style={{
                                     left: `${getItemPosition({ ...step, planned_start: step.actual_start } as any, allItems)}px`,
                                     width: `${getItemWidth({ ...step, planned_start: step.actual_start, planned_end: step.actual_end } as any)}px`,
                                     minWidth: '3px'
                                   }}
                                 />
                               )}
                             </div>
                           </div>
                        </div>
                      ))
                    ) : (
                      // Task View
                      tasksWithDates.map((task) => {
                        const taskSubtasks = subtasks.filter(st => st.task_id === task.id && st.planned_start && st.planned_end);
                        
                        return (
                          <div key={task.id} className="space-y-1">
                             {/* Main Task */}
                             <div className="flex items-center gap-2 py-1">
                               {/* Sticky Task Info */}
                               <div className="sticky left-0 z-30 bg-background w-60 flex-shrink-0 px-1 border-r border-gray-100">
                                 <div className="text-xs font-medium truncate">
                                   {task.task_title}
                                 </div>
                                 <div className="text-[10px] text-muted-foreground">
                                   {task.step_name} | Status: 
                                   <span className={`ml-1 px-1 py-0.5 rounded ${
                                     task.status === 'Done' ? 'bg-green-100 text-green-700' :
                                     task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                     task.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                                     'bg-gray-100 text-gray-700'
                                   }`}>
                                     {task.status}
                                   </span>
                                 </div>
                                 <div className="text-[10px] text-muted-foreground">
                                   {task.planned_start && task.planned_end && (
                                     <>
                                       {formatDateUK(task.planned_start)} - {formatDateUK(task.planned_end)}
                                     </>
                                   )}
                                 </div>
                               </div>

                               {/* Compact Gantt Bar */}
                               <div className="flex-1 relative h-4 bg-gray-100/50 rounded">
                                 <div
                                   className="absolute top-0.5 h-3 rounded"
                                   style={{
                                     left: `${getItemPosition(task, allItems)}px`,
                                     width: `${getItemWidth(task)}px`,
                                     backgroundColor: getItemColor(task),
                                     minWidth: '15px'
                                   }}
                                 >
                                 </div>

                                 {/* Compact Actual bar */}
                                 {task.actual_start && task.actual_end && (
                                   <div
                                     className="absolute bottom-0.5 h-1 bg-blue-600 rounded opacity-70"
                                     style={{
                                       left: `${getItemPosition({ ...task, planned_start: task.actual_start }, allItems)}px`,
                                       width: `${getItemWidth({ ...task, planned_start: task.actual_start, planned_end: task.actual_end })}px`,
                                       minWidth: '3px'
                                     }}
                                   />
                                 )}
                               </div>
                             </div>

                             {/* Compact Subtasks */}
                             {taskSubtasks.map((subtask) => (
                               <div key={subtask.id} className="flex items-center gap-2 py-0.5 ml-3">
                                 {/* Compact Subtask Info */}
                                 <div className="w-48 flex-shrink-0 px-1">
                                   <div className="text-[10px] font-medium truncate text-muted-foreground">
                                     ├─ {subtask.title}
                                   </div>
                                   <div className="text-[9px] text-muted-foreground ml-2">
                                     {subtask.planned_start && subtask.planned_end && (
                                       <>
                                         {formatDateUK(subtask.planned_start)} - {formatDateUK(subtask.planned_end)}
                                       </>
                                     )}
                                   </div>
                                 </div>

                                 {/* Compact Subtask Status */}
                                 <div className="w-12 flex-shrink-0 text-[9px]">
                                   <span className={`px-1 py-0.5 rounded ${
                                     subtask.status === 'Done' ? 'bg-green-100 text-green-700' :
                                     subtask.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                     subtask.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                                     'bg-gray-100 text-gray-700'
                                   }`}>
                                     {subtask.status}
                                   </span>
                                 </div>

                                 {/* Compact Subtask Gantt Bar */}
                                 <div className="flex-1 relative h-3 bg-gray-50/50 rounded">
                                   <div
                                     className="absolute top-0.5 h-2 rounded"
                                     style={{
                                       left: `${getItemPosition(subtask, allItems)}px`,
                                       width: `${getItemWidth(subtask)}px`,
                                       backgroundColor: getItemColor(subtask),
                                       minWidth: '10px',
                                       opacity: 0.8
                                     }}
                                   >
                                   </div>

                                   {/* Compact Actual bar for subtask */}
                                   {subtask.actual_start && subtask.actual_end && (
                                     <div
                                       className="absolute bottom-0.5 h-0.5 bg-blue-600 rounded opacity-70"
                                       style={{
                                         left: `${getItemPosition({ ...subtask, planned_start: subtask.actual_start }, allItems)}px`,
                                         width: `${getItemWidth({ ...subtask, planned_start: subtask.actual_start, planned_end: subtask.actual_end })}px`,
                                         minWidth: '2px'
                                       }}
                                     />
                                   )}
                                 </div>
                               </div>
                             ))}
                          </div>
                        );
                      })
                     )}
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {/* Print Instructions */}
             <div className="text-[10px] text-muted-foreground border-t pt-2">
               <p><strong>Print/Export:</strong> Use browser print (Ctrl+P) to save as PDF.</p>
             </div>
           </div>
         )}
       </CardContent>
     </Card>
  );
};

export default ProjectGantt;