import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, FileDown, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatDateUK } from '@/lib/dateUtils';
import { wbsService, type MasterStep, type MasterTask } from '@/lib/wbsService';
import { useToast } from '@/hooks/use-toast';
import { BarChart } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface WBSGanttChartProps {
  projectId?: string;
}

interface TaskWithDates {
  id: string;
  title: string;
  step_name: string;
  planned_start: string | null;
  planned_end: string | null;
  duration_days: number | null;
  is_milestone: boolean;
  subtasks?: TaskWithDates[];
}

interface StepGroup {
  step_name: string;
  tasks: TaskWithDates[];
  planned_start: string | null;
  planned_end: string | null;
  step_order: number;
}

export function WBSGanttChart({ projectId }: WBSGanttChartProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<MasterStep[]>([]);
  const [stepTasks, setStepTasks] = useState<Record<number, MasterTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [presentationMode, setPresentationMode] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'single' | 'multi'>('single');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadWBSData();
  }, [projectId]);

  const loadWBSData = async () => {
    setLoading(true);
    try {
      const stepData = await wbsService.getMasterSteps();
      setSteps(stepData);

      // Load tasks for each step
      const tasksData: Record<number, MasterTask[]> = {};
      for (const step of stepData) {
        tasksData[step.id] = await wbsService.getStepTasks(step.id);
      }
      setStepTasks(tasksData);
    } catch (error) {
      console.error('Failed to load WBS data:', error);
      toast({
        title: "Error",
        description: "Failed to load WBS data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert WBS data to Gantt format with contract start as today
  const processWBSForGantt = (): StepGroup[] => {
    const contractStartDate = new Date(); // Use today as contract start
    const stepGroups: StepGroup[] = [];

    steps.forEach((step, stepIndex) => {
      const tasks = stepTasks[step.id] || [];
      const processedTasks: TaskWithDates[] = [];
      
      let stepStartOffset = 0; // Days from contract start

      tasks.forEach((task, taskIndex) => {
        // Calculate start date based on step order and task sequence using offset fields
        const taskStartOffset = task.planned_start_offset_days || (taskIndex * 7); // Default 1 week apart
        const taskDuration = (task.planned_end_offset_days || 0) - (task.planned_start_offset_days || 0) + 1; // Duration based on offsets
        const actualDuration = Math.max(1, taskDuration); // Ensure at least 1 day
        
        const taskStart = new Date(contractStartDate);
        taskStart.setDate(taskStart.getDate() + taskStartOffset);
        
        const taskEnd = new Date(taskStart);
        taskEnd.setDate(taskEnd.getDate() + actualDuration - 1);

        const processedTask: TaskWithDates = {
          id: task.id.toString(),
          title: task.title,
          step_name: step.step_name,
          planned_start: taskStart.toISOString().split('T')[0],
          planned_end: taskEnd.toISOString().split('T')[0],
          duration_days: actualDuration,
          is_milestone: actualDuration === 1, // Consider 1-day tasks as milestones
          subtasks: task.subtasks?.map((subtask, subtaskIndex) => {
            const subtaskStart = new Date(taskStart);
            subtaskStart.setDate(subtaskStart.getDate() + subtaskIndex);
            const subtaskEnd = new Date(subtaskStart);
            subtaskEnd.setDate(subtaskEnd.getDate());

            return {
              id: subtask.id.toString(),
              title: subtask.title,
              step_name: step.step_name,
              planned_start: subtaskStart.toISOString().split('T')[0],
              planned_end: subtaskEnd.toISOString().split('T')[0],
              duration_days: 1,
              is_milestone: false,
            };
          }) || []
        };

        processedTasks.push(processedTask);
        
        // Update step start offset for next task (don't overlap, use end + 1)
        stepStartOffset = Math.max(stepStartOffset, taskStartOffset + actualDuration);
      });

      // Calculate step overall dates
      const stepStart = processedTasks.length > 0 ? processedTasks[0].planned_start : null;
      const stepEnd = processedTasks.length > 0 ? 
        processedTasks[processedTasks.length - 1].planned_end : null;

      stepGroups.push({
        step_name: step.step_name,
        tasks: processedTasks,
        planned_start: stepStart,
        planned_end: stepEnd,
        step_order: stepIndex // Use index since step_order may not exist
      });
    });

    return stepGroups.sort((a, b) => a.step_order - b.step_order);
  };

  const stepGroups = processWBSForGantt();
  const allTasks = stepGroups.flatMap(group => group.tasks);
  const allSubtasks = allTasks.flatMap(task => task.subtasks || []);
  const allItems = [...allTasks, ...allSubtasks];

  // Helper functions for Gantt visualization
  const getItemColor = (item: TaskWithDates): string => {
    if (item.is_milestone) return '#8b5cf6'; // Purple for milestones
    return '#3b82f6'; // Blue for regular tasks
  };

  const getItemWidth = (item: TaskWithDates): number => {
    if (!item.planned_start || !item.planned_end) return 20;
    
    const start = new Date(item.planned_start);
    const end = new Date(item.planned_end);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) + 1;
    
    return Math.max(20, duration * 10 * zoomLevel);
  };

  const getItemPosition = (item: TaskWithDates): number => {
    if (!item.planned_start || allItems.length === 0) return 0;
    
    const start = new Date(item.planned_start);
    const projectStart = allItems.reduce((earliest, i) => {
      if (!i.planned_start) return earliest;
      const itemStart = new Date(i.planned_start);
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10 * zoomLevel);
  };

  const getTodayPosition = (): number => {
    if (allItems.length === 0) return 0;
    
    const today = new Date();
    const projectStart = allItems.reduce((earliest, i) => {
      if (!i.planned_start) return earliest;
      const itemStart = new Date(i.planned_start);
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10 * zoomLevel);
  };

  const generateDateMarkers = () => {
    if (allItems.length === 0) return [];

    const projectStart = allItems.reduce((earliest, i) => {
      if (!i.planned_start) return earliest;
      const itemStart = new Date(i.planned_start);
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);

    const projectEnd = allItems.reduce((latest, i) => {
      if (!i.planned_end) return latest;
      const itemEnd = new Date(i.planned_end);
      return !latest || itemEnd > latest ? itemEnd : latest;
    }, null as Date | null);

    if (!projectStart || !projectEnd) return [];

    const markers = [];
    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    
    let interval = 7; // weekly by default
    if (totalDays > 180) interval = 30; // monthly for long projects
    if (totalDays < 30) interval = 3; // every 3 days for short projects

    for (let day = 0; day <= totalDays; day += interval) {
      const date = new Date(projectStart);
      date.setDate(date.getDate() + day);
      
      markers.push({
        date: date,
        position: day * 10 * zoomLevel,
        label: formatDateUK(date.toISOString().split('T')[0])
      });
    }

    return markers;
  };

  const todayPosition = getTodayPosition();
  const dateMarkers = generateDateMarkers();

  // Zoom handlers
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
    setIsExporting(true);
    setExportModalOpen(false);

    try {
      const element = document.querySelector('.wbs-gantt-print') as HTMLElement;
      if (!element) {
        throw new Error('Gantt chart element not found');
      }

      toast({
        title: "Exporting...",
        description: "Generating high-quality PDF, please wait...",
      });

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

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      if (exportType === 'single') {
        // Single page export - scale to fit
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const finalHeight = Math.min(imgHeight, pageHeight - 2 * margin);
        const finalWidth = (canvas.width * finalHeight) / canvas.height;

        const imgData = canvas.toDataURL('image/png', 0.95);

        // Add title
        pdf.setFontSize(16);
        pdf.text('WBS Master Data Gantt Chart', margin, margin + 5);
        pdf.setFontSize(10);
        pdf.text(`Generated on: ${formatDateUK(new Date().toISOString().split('T')[0])}`, margin, margin + 10);
        pdf.text('Contract Start Date: Today (for planning purposes)', margin, margin + 15);

        pdf.addImage(imgData, 'PNG', margin, margin + 20, finalWidth, finalHeight);
      } else {
        // Multi-page export for full resolution
        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const pdfWidth = pageWidth - 2 * margin;
        const pdfHeight = pageHeight - 2 * margin - 25; // Leave space for header
        
        const widthRatio = pdfWidth / imgWidth;
        const heightRatio = pdfHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;
        
        // Calculate how many pages we need
        const totalPages = Math.ceil(scaledWidth / pdfWidth);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();
          
          // Add header to each page
          pdf.setFontSize(16);
          pdf.text('WBS Master Data Gantt Chart', margin, margin + 5);
          pdf.setFontSize(10);
          pdf.text(`Generated on: ${formatDateUK(new Date().toISOString().split('T')[0])} | Page ${page + 1} of ${totalPages}`, margin, margin + 10);
          pdf.text('Contract Start Date: Today (for planning purposes)', margin, margin + 15);
          
          // Calculate the portion of image to show on this page
          const startX = page * pdfWidth;
          const sourceX = startX / ratio;
          const sourceWidth = Math.min(pdfWidth / ratio, imgWidth - sourceX);
          const destWidth = sourceWidth * ratio;
          
          // Create a temporary canvas for this slice
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = sourceWidth;
          tempCanvas.height = imgHeight;
          
          if (tempCtx) {
            tempCtx.drawImage(canvas, sourceX, 0, sourceWidth, imgHeight, 0, 0, sourceWidth, imgHeight);
            const tempImgData = tempCanvas.toDataURL('image/png', 0.95);
            pdf.addImage(tempImgData, 'PNG', margin, margin + 20, destWidth, scaledHeight);
          }
        }
      }

      pdf.save(`wbs-gantt-chart-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export Complete",
        description: "PDF has been downloaded successfully",
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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading WBS Gantt chart...</p>
      </div>
    );
  }

  if (stepGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No WBS data available for Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={`w-full ${presentationMode ? 'border-none shadow-none' : ''} wbs-gantt-print`}>
      <CardHeader className={presentationMode ? 'hidden' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              WBS Master Data Gantt Chart
            </CardTitle>
            <CardDescription>
              Timeline view of Work Breakdown Structure master data (Contract start: Today)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.3}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePresentationMode}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Gantt Chart</DialogTitle>
                  <DialogDescription>
                    Choose export options for your WBS Gantt chart
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-type">Export Type</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="single"
                          checked={exportType === 'single'}
                          onChange={(e) => setExportType(e.target.value as 'single' | 'multi')}
                        />
                        <span>Single page (scaled to fit)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="multi"
                          checked={exportType === 'multi'}
                          onChange={(e) => setExportType(e.target.value as 'single' | 'multi')}
                        />
                        <span>Multi-page (full resolution)</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={exportToPDF} disabled={isExporting}>
                      {isExporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="relative">
          {/* Date markers */}
          <div className="mb-4 relative" style={{ minHeight: '30px' }}>
            {dateMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-0 text-xs text-muted-foreground whitespace-nowrap"
                style={{ left: `${marker.position}px` }}
              >
                <div className="border-l border-muted-foreground/30 h-4 mb-1"></div>
                <div className="transform -translate-x-1/2">
                  {marker.label}
                </div>
              </div>
            ))}
          </div>

          {/* Today line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${todayPosition}px` }}
          >
            <div className="absolute -top-2 -left-8 text-xs text-red-500 font-medium">
              Today
            </div>
          </div>

          {/* Steps and Tasks */}
          <div className="space-y-6">
            {stepGroups.map((step, stepIndex) => (
              <div key={step.step_name} className="space-y-2">
                {/* Step header */}
                <div className="flex items-center gap-4 py-2 border-b">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg">{step.step_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {step.tasks.length} tasks
                      {step.planned_start && step.planned_end && (
                        <span className="ml-2">
                          ({formatDateUK(step.planned_start)} - {formatDateUK(step.planned_end)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Tasks in this step */}
                {step.tasks.map((task, taskIndex) => (
                  <div key={task.id} className="ml-4 space-y-1">
                    {/* Main task bar */}
                    <div className="flex items-center gap-4 py-1">
                      <div className="min-w-0 w-64 flex-shrink-0">
                        <div className="text-sm font-medium truncate" title={task.title}>
                          {task.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {task.duration_days} days
                          {task.is_milestone && (
                            <span className="ml-2 text-purple-600">• Milestone</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative flex-1 h-6">
                        {task.planned_start && task.planned_end && (
                          <div
                            className="absolute top-1 h-4 rounded border border-gray-300 flex items-center justify-center text-xs text-white font-medium shadow-sm"
                            style={{
                              left: `${getItemPosition(task)}px`,
                              width: `${getItemWidth(task)}px`,
                              backgroundColor: getItemColor(task),
                            }}
                          >
                            {task.is_milestone ? '♦' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    {task.subtasks?.map((subtask, subtaskIndex) => (
                      <div key={subtask.id} className="ml-6 flex items-center gap-4 py-0.5">
                        <div className="min-w-0 w-56 flex-shrink-0">
                          <div className="text-xs text-muted-foreground truncate" title={subtask.title}>
                            └ {subtask.title}
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {subtask.duration_days} days
                          </div>
                        </div>
                        
                        <div className="relative flex-1 h-4">
                          {subtask.planned_start && subtask.planned_end && (
                            <div
                              className="absolute top-0.5 h-3 rounded border border-gray-300 bg-gray-400"
                              style={{
                                left: `${getItemPosition(subtask)}px`,
                                width: `${getItemWidth(subtask)}px`,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-4 border-t">
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-blue-500 rounded border"></div>
                <span>Regular Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-purple-500 rounded border flex items-center justify-center text-white">♦</div>
                <span>Milestone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-gray-400 rounded border"></div>
                <span>Subtask</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-red-500"></div>
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Custom print styles */}
      <style>{`
        @media print {
          .wbs-gantt-print {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .wbs-gantt-print * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </Card>
  );
}