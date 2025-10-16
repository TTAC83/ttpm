import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { BarChart, List, Grid3X3, ZoomIn, ZoomOut, Maximize2, FileDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  projectId?: string;
  solutionsProjectId?: string;
}

const ProjectGantt = ({ projectId, solutionsProjectId }: ProjectGanttProps) => {
  const effectiveProjectId = projectId || solutionsProjectId!;
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [stepPositions, setStepPositions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('task');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [presentationMode, setPresentationMode] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'single' | 'multi'>('single');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchStepPositions();
    fetchTasksSubtasksAndEvents();
    fetchProjectDetails();
  }, [effectiveProjectId]);

  const fetchStepPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('master_steps')
        .select('name, position');
      
      if (error) throw error;
      
      const positions: Record<string, number> = {};
      (data || []).forEach(step => {
        positions[step.name] = step.position;
      });
      setStepPositions(positions);
    } catch (error) {
      console.error('Error fetching step positions:', error);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      if (solutionsProjectId) {
        const { data: projectData, error } = await supabase
          .from('solutions_projects')
          .select('site_name, companies(name)')
          .eq('id', effectiveProjectId)
          .single();

        if (error) throw error;
        setProject({
          project_name: projectData.site_name,
          customer_name: projectData.companies?.name || 'Unknown Customer'
        });
      } else {
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('name, companies(name)')
          .eq('id', effectiveProjectId)
          .single();

        if (error) throw error;
        setProject({
          project_name: projectData.name,
          customer_name: projectData.companies?.name || 'Unknown Customer'
        });
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchTasksSubtasksAndEvents = async () => {
    try {
      console.log('ProjectGantt: Starting to fetch tasks, subtasks, and events for project:', effectiveProjectId);
      setLoading(true);
      
      // Fetch tasks
      let taskQuery = supabase
        .from('project_tasks')
        .select('id, step_name, task_title, planned_start, planned_end, actual_start, actual_end, status');
      
      if (solutionsProjectId) {
        taskQuery = taskQuery.eq('solutions_project_id', effectiveProjectId);
      } else {
        taskQuery = taskQuery.eq('project_id', effectiveProjectId);
      }
      
      const { data: tasksData, error: tasksError } = await taskQuery.order('planned_start');

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

      // Fetch calendar events (only for implementation projects for now)
      let eventsData = [];
      if (!solutionsProjectId) {
        const { data, error: eventsError } = await supabase
          .from('project_events')
          .select('*')
          .eq('project_id', effectiveProjectId)
          .order('start_date');

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
        } else {
          eventsData = data || [];
        }
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
    
    return Math.max(20, duration * 10 * zoomLevel); // 10px per day * zoom level, minimum 20px
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
    return Math.max(0, daysDiff * 10 * zoomLevel); // 10px per day * zoom level
  };

  // Helper function for event bars
  const getEventColor = (event: ProjectEvent): string => {
    return event.is_critical ? '#ef4444' : '#8b5cf6'; // Red for critical events, purple for others
  };

  const getEventWidth = (event: ProjectEvent): number => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) + 1; // +1 to include both start and end dates
    
    return Math.max(20, duration * 10 * zoomLevel); // 10px per day * zoom level, minimum 20px
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
    return Math.max(0, daysDiff * 10 * zoomLevel); // 10px per day * zoom level
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
    return Math.max(0, daysDiff * 10 * zoomLevel); // 10px per day * zoom level
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
        position: day * 10 * zoomLevel, // 10px per day * zoom level
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
    
    // Sort step groups by position from master_steps
    return Object.values(stepGroups).sort((a, b) => {
      const posA = stepPositions[a.step_name] ?? 999;
      const posB = stepPositions[b.step_name] ?? 999;
      return posA - posB;
    });
  };

  // Create combined list for positioning calculation
  const tasksWithDates = tasks.filter(task => task.planned_start && task.planned_end);
  const stepGroups = groupTasksByStep(tasksWithDates);
  const stepsWithDates = stepGroups.filter(step => step.planned_start && step.planned_end);
  
  const allItems: (Task | Subtask | ProjectEvent | StepGroup)[] = [
    ...(viewMode === 'step' ? stepsWithDates : tasksWithDates),
    ...subtasks.filter(st => st.planned_start && st.planned_end),
    ...events
  ];
  
  const todayPosition = getTodayPosition(allItems);
  const dateMarkers = generateDateMarkers(allItems);

  console.log('Gantt chart data:', { 
    tasksCount: tasksWithDates.length, 
    stepsCount: stepsWithDates.length,
    subtasksCount: subtasks.length,
    eventsCount: events.length,
    allItemsCount: allItems.length,
    dateMarkersCount: dateMarkers.length 
  });

  // Zoom and presentation mode handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleFitToScreen = () => {
    setZoomLevel(1);
  };

  const handleTogglePresentationMode = () => {
    setPresentationMode(!presentationMode);
  };

  // PDF Export functionality
  const exportToPDF = async () => {
    if (!project) {
      toast({
        title: "Error",
        description: "Project details not available for export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportModalOpen(false);

    try {
      // Target the entire card element instead of just the content
      const element = document.querySelector('.gantt-print') as HTMLElement;
      if (!element) {
        throw new Error('Gantt chart element not found');
      }

      toast({
        title: "Exporting...",
        description: "Generating high-quality PDF, please wait...",
      });

      // Create high-quality canvas from the chart
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        backgroundColor: '#ffffff',
        removeContainer: false,
        foreignObjectRendering: false,
        logging: false
      });

      // Use A3 landscape for better space utilization
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const headerHeight = 40;

      // Calculate optimal dimensions
      const availableWidth = pdfWidth - (2 * margin);
      const availableHeight = pdfHeight - headerHeight - (2 * margin);
      
      // Calculate aspect ratio preserving dimensions
      const canvasAspectRatio = canvas.width / canvas.height;
      let finalWidth = availableWidth;
      let finalHeight = availableWidth / canvasAspectRatio;
      
      // If height exceeds available space, scale by height instead
      if (finalHeight > availableHeight) {
        finalHeight = availableHeight;
        finalWidth = availableHeight * canvasAspectRatio;
      }

      if (exportType === 'single') {
        // Single page with optimized sizing
        
        // Add professional header
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Project Gantt Chart', margin, 20);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Project: ${project.project_name}`, margin, 30);
        pdf.text(`Customer: ${project.customer_name}`, margin, 37);
        
        const dateStr = new Date().toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        pdf.text(`Generated: ${dateStr}`, pdfWidth - 80, 30);
        
        // Add logo if available
        const logoImg = document.querySelector('img[src*="thingtrax"]') as HTMLImageElement;
        if (logoImg) {
          try {
            pdf.addImage(logoImg, 'PNG', pdfWidth - 80, 10, 60, 20);
          } catch (e) {
            console.warn('Could not add logo to PDF');
          }
        }

        // Center the chart horizontally if it's smaller than available width
        const xOffset = margin + (availableWidth - finalWidth) / 2;

        // Add chart with high quality
        pdf.addImage(
          canvas.toDataURL('image/png', 1.0), 
          'PNG', 
          xOffset, 
          headerHeight + margin, 
          finalWidth, 
          finalHeight,
          undefined,
          'MEDIUM'
        );
        
        // Add legend at bottom
        const legendY = headerHeight + margin + finalHeight + 10;
        if (legendY < pdfHeight - 20) {
          pdf.setFontSize(8);
          pdf.text('Legend:', margin, legendY);
          pdf.text('■ Completed on time', margin + 20, legendY);
          pdf.setTextColor(16, 185, 129);
          pdf.text('■', margin + 15, legendY);
          pdf.setTextColor(0, 0, 0);
          pdf.text('■ Completed late', margin + 80, legendY);
          pdf.setTextColor(239, 68, 68);
          pdf.text('■', margin + 75, legendY);
          pdf.setTextColor(0, 0, 0);
          pdf.text('■ In progress/Overdue', margin + 140, legendY);
          pdf.setTextColor(252, 165, 165);
          pdf.text('■', margin + 135, legendY);
          pdf.setTextColor(0, 0, 0);
          pdf.text('■ Not started', margin + 200, legendY);
          pdf.setTextColor(209, 213, 219);
          pdf.text('■', margin + 195, legendY);
          pdf.setTextColor(0, 0, 0);
        }
        
      } else {
        // Multi-page export with proper sectioning
        const contentHeight = pdfHeight - headerHeight - (2 * margin);
        const totalPages = Math.ceil(finalHeight / contentHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          // Header on each page
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Project Gantt Chart - Page ${page + 1}`, margin, 20);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Project: ${project.project_name}`, margin, 30);
          pdf.text(`Customer: ${project.customer_name}`, margin, 37);
          pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pdfWidth - 80, 30);
          
          // Footer with page numbers
          pdf.setFontSize(8);
          pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth / 2 - 10, pdfHeight - 10);

          // Calculate the source area for this page
          const pageContentHeight = contentHeight;
          const sourceY = (page * pageContentHeight * canvas.height) / finalHeight;
          const sourceHeight = Math.min((pageContentHeight * canvas.height) / finalHeight, canvas.height - sourceY);
          
          // Create a section of the canvas for this page
          const sectionCanvas = document.createElement('canvas');
          sectionCanvas.width = canvas.width;
          sectionCanvas.height = sourceHeight;
          const sectionCtx = sectionCanvas.getContext('2d');
          
          if (sectionCtx) {
            sectionCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );
            
            // Calculate dimensions for this section
            const sectionAspectRatio = sectionCanvas.width / sectionCanvas.height;
            let sectionWidth = availableWidth;
            let sectionHeight = availableWidth / sectionAspectRatio;
            
            if (sectionHeight > pageContentHeight) {
              sectionHeight = pageContentHeight;
              sectionWidth = pageContentHeight * sectionAspectRatio;
            }
            
            const xOffset = margin + (availableWidth - sectionWidth) / 2;
            
            pdf.addImage(
              sectionCanvas.toDataURL('image/png', 1.0),
              'PNG',
              xOffset,
              headerHeight + margin,
              sectionWidth,
              sectionHeight,
              undefined,
              'MEDIUM'
            );
          }
        }
      }

      // Save PDF with descriptive filename
      const fileName = `gantt-chart-${project.project_name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: `High-quality PDF exported successfully (${exportType === 'single' ? '1 page' : 'multi-page'})`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.3cm;
          }
          
          body * {
            visibility: hidden;
          }
          
          .gantt-print, .gantt-print * {
            visibility: visible;
          }
          
          .gantt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            transform: scale(0.6) !important;
            transform-origin: top left !important;
            overflow: visible !important;
          }
          
          .gantt-print * {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            max-width: none !important;
          }
          
          .gantt-print .overflow-auto,
          .gantt-print .overflow-x-auto {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          
          .gantt-print .sticky {
            position: static !important;
            left: auto !important;
            top: auto !important;
            z-index: auto !important;
          }
          
          .gantt-print .relative {
            position: static !important;
          }
          
          .gantt-print .absolute {
            position: static !important;
            left: auto !important;
            top: auto !important;
          }
          
          .gantt-print .text-xs,
          .gantt-print .text-\\[10px\\] {
            font-size: 6px !important;
            line-height: 8px !important;
          }
          
          .gantt-print .text-sm {
            font-size: 8px !important;
            line-height: 10px !important;
          }
          
          .gantt-print h3 {
            font-size: 10px !important;
            line-height: 12px !important;
          }
          
          .gantt-print .space-y-1 > * + * {
            margin-top: 1px !important;
          }
          
          .gantt-print .py-1 {
            padding-top: 0.5px !important;
            padding-bottom: 0.5px !important;
          }
          
          .gantt-print .px-1 {
            padding-left: 1px !important;
            padding-right: 1px !important;
          }
          
          .gantt-print .gap-2 {
            gap: 1px !important;
          }
          
          .gantt-print .h-4 {
            height: 8px !important;
          }
          
          .gantt-print .h-3 {
            height: 6px !important;
          }
          
          .gantt-print .border-r {
            border-right: 0.5px solid #e5e7eb !important;
          }
          
          .gantt-print .border-b {
            border-bottom: 0.5px solid #e5e7eb !important;
          }
          
          .gantt-print .w-60 {
            width: 120px !important;
          }
          
          .gantt-print .w-57 {
            width: 114px !important;
          }
          
          /* Force all containers to expand */
          .gantt-print .min-w-full {
            min-width: 100% !important;
            width: auto !important;
          }
          
          /* Hide scroll indicators */
          .gantt-print ::-webkit-scrollbar {
            display: none !important;
          }
          
          .gantt-print {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
        }
      `}</style>
      
      <Card className="gantt-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Project Gantt Chart
                {presentationMode && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Presentation Mode)
                  </span>
                )}
              </CardTitle>
            </div>
            <div className="flex gap-2 print:hidden">
              {!presentationMode && (
                <>
                  <div className="flex gap-1 border-r pr-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 0.3}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFitToScreen}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Export PDF
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Export Gantt Chart to PDF</DialogTitle>
                        <DialogDescription>
                          Choose how you'd like to export the chart
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="single"
                              name="exportType"
                              value="single"
                              checked={exportType === 'single'}
                              onChange={(e) => setExportType(e.target.value as 'single' | 'multi')}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="single" className="flex-1">
                              <div className="font-medium">Fit to 1 Page</div>
                              <div className="text-sm text-muted-foreground">
                                Scale entire project to fit one A3 landscape page
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="multi"
                              name="exportType"
                              value="multi"
                              checked={exportType === 'multi'}
                              onChange={(e) => setExportType(e.target.value as 'single' | 'multi')}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="multi" className="flex-1">
                              <div className="font-medium">Multi-page</div>
                              <div className="text-sm text-muted-foreground">
                                Preserve current zoom level across multiple pages
                              </div>
                            </Label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={exportToPDF} disabled={isExporting}>
                            {isExporting ? "Exporting..." : "Export"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              
              <Button
                variant={presentationMode ? 'default' : 'outline'}
                size="sm"
                onClick={handleTogglePresentationMode}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {presentationMode ? 'Exit' : 'Present'}
              </Button>
              
              {!presentationMode && (
                <>
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
                </>
              )}
            </div>
          </div>
          <CardDescription>
            {presentationMode ? (
              `Clean view for customer presentations - Zoom: ${Math.round(zoomLevel * 100)}%`
            ) : (
              `Visual timeline showing planned vs actual ${viewMode === 'step' ? 'step' : 'task'} completion and calendar events - Zoom: ${Math.round(zoomLevel * 100)}%`
            )}
          </CardDescription>
        </CardHeader>
      <CardContent className="p-3">
        <div className="gantt-chart-content">
        {(viewMode === 'step' ? stepsWithDates.length === 0 : tasksWithDates.length === 0) && events.length === 0 ? (
          <div className="text-center py-4">
            <BarChart className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No {viewMode === 'step' ? 'steps' : 'tasks'} or events with dates found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact Legend - Hidden in presentation mode */}
            {!presentationMode && (
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
            )}

            {/* Calendar Events Section */}
            {events.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-purple-700 border-b border-purple-200/50 pb-1">
                  📅 Events
                </h3>
                <div className="flex border border-gray-200 rounded">
                  {/* Fixed left column - Event names */}
                  <div className="w-60 flex-shrink-0 border-r border-gray-200">
                    <div className="sticky top-0 z-30 bg-background border-b border-gray-200 px-2 py-1 h-12">
                      <div className="text-xs font-semibold">Events</div>
                      <div className="text-[10px] text-muted-foreground">Event Dates</div>
                    </div>
                    <div className={`${presentationMode ? '' : 'max-h-96 overflow-y-auto'}`}>
                      {events.map((event) => (
                        <div key={event.id} className="px-1 py-2 border-b border-gray-100 bg-purple-50/50">
                          <div className="text-xs font-medium truncate text-purple-900">{event.title}</div>
                          <div className="text-[10px] text-purple-600">
                            {formatDateUK(event.start_date)}
                            {event.start_date !== event.end_date && ` - ${formatDateUK(event.end_date)}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable right column - Chart with date markers */}
                  <div className={`flex-1 overflow-x-auto ${presentationMode ? '' : 'max-h-96 overflow-y-auto'}`}>
                    <div className="relative" style={{ minWidth: 'max-content' }}>
                      {/* Date markers header */}
                      <div className="sticky top-0 z-20 bg-background border-b border-gray-200 h-12">
                        <div className="relative h-full">
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

                      {/* Chart content */}
                      <div className="relative">
                        {/* Today line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                          style={{ left: `${todayPosition}px` }}
                        >
                          <div className="absolute -top-5 -left-6 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded whitespace-nowrap">
                            Today
                          </div>
                        </div>

                        {/* Event bars */}
                        {events.map((event) => (
                          <div key={event.id} className="relative h-10 border-b border-gray-100 bg-purple-100/30">
                            <div
                              className="absolute top-2 h-6 rounded flex items-center justify-center text-[10px] text-white font-medium"
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
                        ))}
                      </div>
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
                <div className="flex border border-gray-200 rounded">
                  {/* Fixed left column - Task/Step names */}
                  <div className="w-60 flex-shrink-0 border-r border-gray-200">
                    <div className="sticky top-0 z-30 bg-background border-b border-gray-200 px-2 py-1 h-12">
                      <div className="text-xs font-semibold">Task / Step</div>
                      <div className="text-[10px] text-muted-foreground">Planned Dates</div>
                    </div>
                    <div className={`${presentationMode ? '' : 'max-h-96 overflow-y-auto'}`}>
                      {viewMode === 'step' ? (
                        // Step View - Names
                        stepsWithDates.map((step) => (
                          <div key={step.step_name} className="px-1 py-2 border-b border-gray-100 bg-blue-50/50">
                            <div className="text-xs font-medium truncate">{step.step_name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {step.tasks.length} task{step.tasks.length !== 1 ? 's' : ''} | 
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
                                <>{formatDateUK(step.planned_start)} - {formatDateUK(step.planned_end)}</>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        // Task View - Names
                        tasksWithDates.map((task) => {
                          const taskSubtasks = subtasks.filter(st => st.task_id === task.id && st.planned_start && st.planned_end);
                          return (
                            <div key={task.id} className="border-b border-gray-100">
                              <div className="px-1 py-2">
                                <div className="text-xs font-medium truncate">{task.task_title}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {task.step_name} | 
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
                                    <>{formatDateUK(task.planned_start)} - {formatDateUK(task.planned_end)}</>
                                  )}
                                </div>
                              </div>
                              {taskSubtasks.map((subtask) => (
                                <div key={subtask.id} className="px-1 py-1 ml-3 text-[10px] text-muted-foreground">
                                  ├─ {subtask.title}
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Scrollable right column - Chart with date markers */}
                  <div className={`flex-1 overflow-x-auto ${presentationMode ? '' : 'max-h-96 overflow-y-auto'}`}>
                    <div className="relative" style={{ minWidth: 'max-content' }}>
                      {/* Date markers header */}
                      <div className="sticky top-0 z-20 bg-background border-b border-gray-200 h-12">
                        <div className="relative h-full">
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

                      {/* Chart content */}
                      <div className="relative">
                        {/* Today line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                          style={{ left: `${todayPosition}px` }}
                        >
                          <div className="absolute -top-5 -left-6 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded whitespace-nowrap">
                            Today
                          </div>
                        </div>

                        {viewMode === 'step' ? (
                          // Step View - Chart bars
                          stepsWithDates.map((step) => (
                            <div key={step.step_name} className="relative h-16 border-b border-gray-100 bg-gray-100/30">
                              <div
                                className="absolute top-4 h-8 rounded"
                                style={{
                                  left: `${getItemPosition(step as any, allItems)}px`,
                                  width: `${getItemWidth(step as any)}px`,
                                  backgroundColor: getItemColor(step as any),
                                  minWidth: '15px'
                                }}
                              />
                              {step.actual_start && step.actual_end && (
                                <div
                                  className="absolute bottom-2 h-2 bg-blue-600 rounded opacity-70"
                                  style={{
                                    left: `${getItemPosition({ ...step, planned_start: step.actual_start } as any, allItems)}px`,
                                    width: `${getItemWidth({ ...step, planned_start: step.actual_start, planned_end: step.actual_end } as any)}px`,
                                    minWidth: '3px'
                                  }}
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          // Task View - Chart bars
                          tasksWithDates.map((task) => {
                            const taskSubtasks = subtasks.filter(st => st.task_id === task.id && st.planned_start && st.planned_end);
                            const taskHeight = 12 + (taskSubtasks.length * 8);
                            
                            return (
                              <div key={task.id} className="relative border-b border-gray-100 bg-gray-100/30" style={{ height: `${taskHeight}px` }}>
                                <div
                                  className="absolute top-2 h-8 rounded"
                                  style={{
                                    left: `${getItemPosition(task, allItems)}px`,
                                    width: `${getItemWidth(task)}px`,
                                    backgroundColor: getItemColor(task),
                                    minWidth: '15px'
                                  }}
                                />
                                {task.actual_start && task.actual_end && (
                                  <div
                                    className="absolute top-9 h-2 bg-blue-600 rounded opacity-70"
                                    style={{
                                      left: `${getItemPosition({ ...task, planned_start: task.actual_start }, allItems)}px`,
                                      width: `${getItemWidth({ ...task, planned_start: task.actual_start, planned_end: task.actual_end })}px`,
                                      minWidth: '3px'
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

             {/* Print Instructions */}
             <div className="text-[10px] text-muted-foreground border-t pt-2 print:hidden">
               <p><strong>Print/Export:</strong> Use browser print (Ctrl+P) and select "Landscape" orientation to save as PDF.</p>
             </div>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default ProjectGantt;