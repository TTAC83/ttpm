import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, ZoomIn, ZoomOut, ArrowDown, ArrowRight, Grid3x3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wbsService, type MasterStep, type MasterTask } from "@/lib/wbsService";
import { useToast } from "@/hooks/use-toast";
import { WBSTaskDialog } from "@/components/WBSTaskDialog";
import { calculateProjectCompletion, ProjectCompletion } from '@/lib/projectCompletionService';
import { Progress } from '@/components/ui/progress';
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Add CSS for grid layout with workflow guides
const gridStyles = `
  .react-grid-layout {
    position: relative;
    background-image: 
      linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top, box-shadow;
    border-radius: 8px;
  }
  .react-grid-item.cssTransforms {
    transition-property: transform, box-shadow;
  }
  .react-grid-item:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
  }
  .react-grid-item.react-draggable-dragging {
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 1001;
  }
  .react-grid-item > .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0;
    right: 0;
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZpbGw9IiM0NDRBNCI+PHBhdGggZD0ibTYgNkgwVjBoNnYxSDJWMGg0djJIMHY0eiIvPjwvZz48L3N2Zz4=');
    background-position: bottom right;
    padding: 0 3px 3px 0;
    background-repeat: no-repeat;
    background-origin: content-box;
    box-sizing: border-box;
    cursor: se-resize;
    opacity: 0.7;
  }
  .workflow-guide {
    position: absolute;
    pointer-events: none;
    z-index: 0;
  }
  .workflow-guide.vertical {
    width: 2px;
    background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.3), transparent);
  }
  .workflow-guide.horizontal {
    height: 2px;
    background: linear-gradient(to right, transparent, rgba(34, 197, 94, 0.3), transparent);
  }
`;

const ResponsiveGridLayout = WidthProvider(Responsive);
const ZOOM_LEVELS = [50, 75, 100, 125];

interface WBSProps {
  projectId?: string;
}

export default function WBS({ projectId }: WBSProps = {}) {
  // Check URL params for project ID if not provided as prop
  const [searchParams] = useSearchParams();
  const currentProjectId = projectId || searchParams.get('projectId') || undefined;
  
  // Inject CSS for grid layout
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = gridStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { toast } = useToast();
  const [steps, setSteps] = useState<MasterStep[]>([]);
  const [stepTasks, setStepTasks] = useState<Record<number, MasterTask[]>>({});
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({ lg: [] });
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [canUpdate, setCanUpdate] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"sequential" | "parallel" | "custom">("custom");
  const [stepRows, setStepRows] = useState<Record<string, number>>({});
  const [selectedStep, setSelectedStep] = useState<MasterStep | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isProjectSpecific, setIsProjectSpecific] = useState(!!currentProjectId);
  const [projectCompletion, setProjectCompletion] = useState<ProjectCompletion | null>(null);

  // Load data on mount - use project-specific data if projectId is provided
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [stepData, savedLayouts, updatePermission] = await Promise.all([
          currentProjectId ? wbsService.getProjectSteps(currentProjectId) : wbsService.getMasterSteps(),
          wbsService.getWBSLayouts(currentProjectId),
          wbsService.canUpdateLayout(currentProjectId)
        ]);

        setSteps(stepData);
        setCanUpdate(updatePermission);

        // Load tasks for each step
        const tasksData: Record<number, MasterTask[]> = {};
        if (currentProjectId) {
          // For project-specific view, we'll load project tasks in a different way
          // For now, fallback to master tasks
          for (const step of stepData) {
            tasksData[step.id] = await wbsService.getStepTasks(step.id);
          }
        } else {
          // For global template view
          for (const step of stepData) {
            tasksData[step.id] = await wbsService.getStepTasks(step.id);
          }
        }
        setStepTasks(tasksData);

        // Convert saved layouts to react-grid-layout format and extract row assignments
        const layoutMap: Record<string, Layout[]> = { lg: [] };
        const rowAssignments: Record<string, number> = {};
        const savedLayoutMap = Object.fromEntries(
          savedLayouts.map(layout => [layout.step_name, layout])
        );

        stepData.forEach((step, index) => {
          const saved = savedLayoutMap[step.step_name];
          if (saved) {
            layoutMap.lg.push({
              i: step.step_name,
              x: saved.pos_x,
              y: saved.pos_y,
              w: saved.width,
              h: saved.height
            });
            // Extract row from y position (assuming 4 units per row)
            rowAssignments[step.step_name] = Math.floor(saved.pos_y / 4) + 1;
          } else {
            // Default layout - arrange in rows of 5
            const row = Math.floor(index / 5);
            const col = index % 5;
            layoutMap.lg.push({
              i: step.step_name,
              x: col * 2, // 2 units wide, 5 cards per row (10 total columns)
              y: row * 4, // 4 units per row
              w: 2,
              h: 3
            });
            rowAssignments[step.step_name] = row + 1;
          }
        });

        setStepRows(rowAssignments);

        setLayouts(layoutMap);

        // Calculate project completion if viewing a specific project
        if (currentProjectId) {
          const completion = await calculateProjectCompletion(currentProjectId);
          setProjectCompletion(completion);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load ${currentProjectId ? 'project' : 'master'} data`
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast, currentProjectId]);

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    if (!canUpdate) return;

    // Prevent dragging above y=0 and ensure no overlapping
    const boundedLayout = layout.map(item => ({
      ...item,
      y: Math.max(0, item.y), // Prevent negative Y positions
      x: Math.max(0, item.x)  // Prevent negative X positions
    }));

    setLayouts({ lg: boundedLayout });

    // Debounced save
    const saveTimeout = setTimeout(async () => {
      try {
        for (const item of boundedLayout) {
          await wbsService.saveWBSLayout({
            step_name: item.i,
            pos_x: item.x,
            pos_y: item.y,
            width: item.w,
            height: item.h
          }, currentProjectId);
        }
        toast({
          title: "Layout saved",
          description: "WBS layout has been saved"
        });
      } catch (error) {
        console.error("Failed to save layout:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save layout"
        });
      }
    }, 200);

    return () => clearTimeout(saveTimeout);
  }, [canUpdate, toast]);

  const handleResetLayout = async () => {
    try {
      await wbsService.resetWBSLayout(currentProjectId);
      
      // Apply layout based on current mode
      applyLayoutMode(layoutMode);
      
      toast({
        title: "Layout reset",
        description: `WBS layout reset to ${layoutMode} mode`
      });
    } catch (error) {
      console.error("Failed to reset layout:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset layout"
      });
    }
  };

  const applyLayoutMode = (mode: "sequential" | "parallel" | "custom") => {
    let newLayout: Layout[];
    const newRowAssignments: Record<string, number> = {};
    
    if (mode === "sequential") {
      // Horizontal arrangement - all in row 1, sequentially
      newLayout = steps.map((step, index) => {
        newRowAssignments[step.step_name] = Math.floor(index / 5) + 1;
        return {
          i: step.step_name,
          x: (index % 5) * 2, // 5 cards per row, width 2 each
          y: Math.floor(index / 5) * 4, // Start new row after 5 cards
          w: 2,
          h: 3
        };
      });
    } else if (mode === "parallel") {
      // Each step gets its own row for parallel workflow
      newLayout = steps.map((step, index) => {
        newRowAssignments[step.step_name] = index + 1;
        return {
          i: step.step_name,
          x: 0, // All in first column
          y: index * 4, // Each in different row
          w: 2,
          h: 3
        };
      });
    } else {
      // Keep current layout for custom mode
      return;
    }
    
    setLayouts({ lg: newLayout });
    setStepRows(newRowAssignments);
    setLayoutMode(mode);
  };

  const handleRowChange = async (stepName: string, newRow: number) => {
    if (!canUpdate) return;
    
    const newRowAssignments = { ...stepRows, [stepName]: newRow };
    setStepRows(newRowAssignments);
    
    // Update layout based on row assignments
    const newLayout = layouts.lg.map(item => {
      if (item.i === stepName) {
        // Find how many items are in the target row already
        const itemsInRow = Object.entries(newRowAssignments)
          .filter(([key, row]) => row === newRow && key !== stepName)
          .length;
        
        return {
          ...item,
          x: (itemsInRow % 5) * 2, // Position horizontally in row, max 5 per row
          y: (newRow - 1) * 4 // Position in correct row
        };
      }
      return item;
    });
    
    setLayouts({ lg: newLayout });
  };

  const handleStepDoubleClick = (step: MasterStep) => {
    setSelectedStep(step);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSave = (updatedTasks: MasterTask[]) => {
    if (selectedStep) {
      setStepTasks(prev => ({
        ...prev,
        [selectedStep.id]: updatedTasks
      }));
      toast({
        title: "Tasks updated",
        description: "Step tasks have been updated successfully"
      });
    }
  };

  const getTechnologyScopeColor = (scope: string) => {
    switch (scope) {
      case "both": return "default";
      case "iot": return "secondary";
      case "vision": return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading master data...</p>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Work Breakdown Structure</h1>
          <p className="text-muted-foreground mt-2">
            {currentProjectId ? 'Project-Specific Layout' : 'Master Steps and Tasks'}
          </p>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">
              {currentProjectId ? 'No project steps found' : 'No master steps found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Breakdown Structure</h1>
          <p className="text-muted-foreground mt-2">
            {currentProjectId ? 'Project-Specific Layout' : 'Master Steps and Tasks Template'}
            {!canUpdate && <Badge variant="secondary" className="ml-2">Read-only</Badge>}
            {currentProjectId && <Badge variant="outline" className="ml-2">Project View</Badge>}
          </p>
          {/* Project Completion Summary */}
          {currentProjectId && projectCompletion && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Project Completion</h3>
                <span className="text-2xl font-bold text-primary">
                  {projectCompletion.completionPercentage}%
                </span>
              </div>
              <Progress value={projectCompletion.completionPercentage} className="h-3 mb-2" />
              <p className="text-sm text-muted-foreground">
                {projectCompletion.completedTasks} of {projectCompletion.totalTasks} tasks and subtasks completed
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Layout Mode Selector */}
          <Tabs value={layoutMode} onValueChange={(value) => applyLayoutMode(value as any)} className="flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sequential" className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Sequential
              </TabsTrigger>
              <TabsTrigger value="parallel" className="flex items-center gap-1">
                <ArrowDown className="h-3 w-3" />
                Parallel
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-1">
                <Grid3x3 className="h-3 w-3" />
                Row-based
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Select value={zoom.toString()} onValueChange={(value) => setZoom(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map(level => (
                  <SelectItem key={level} value={level.toString()}>
                    {level}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(125, zoom + 25))}
              disabled={zoom >= 125}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            disabled={!canUpdate}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </Button>
        </div>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-blue-400" />
            <span>Sequential: Steps arranged horizontally in order</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="h-3 w-3 text-green-400" />
            <span>Parallel: Each step in its own row for parallel execution</span>
          </div>
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-3 w-3 text-purple-400" />
            <span>Row-based: Assign cards to specific rows manually</span>
          </div>
        </div>
      </div>

      <div 
        className="relative border rounded-lg bg-muted/50 p-4 overflow-auto"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", minHeight: "600px" }}
      >
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 10, md: 10, sm: 10, xs: 10, xxs: 10 }}
          isDraggable={canUpdate}
          isResizable={canUpdate}
          margin={[8, 8]}
          containerPadding={[16, 16]}
          rowHeight={60}
          compactType={null}
          preventCollision={true}
          allowOverlap={false}
        >
          {steps.map((step) => (
            <div key={step.step_name} className="h-full">
              <Card 
                className="h-full overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20 cursor-pointer"
                onDoubleClick={() => handleStepDoubleClick(step)}
              >
                <CardHeader className="pb-2 bg-gradient-to-r from-background to-muted/30">
                  <div className="mb-2">
                    <CardTitle className="text-sm font-semibold leading-tight text-foreground mb-2">
                      {step.step_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {step.task_count} tasks
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Step {step.position}
                      </Badge>
                    </div>
                  </div>
                  
                  {layoutMode === "custom" && canUpdate && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Row:</span>
                      <Select 
                        value={stepRows[step.step_name]?.toString() || "1"} 
                        onValueChange={(value) => handleRowChange(step.step_name, parseInt(value))}
                      >
                        <SelectTrigger className="w-16 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(row => (
                            <SelectItem key={row} value={row.toString()}>
                              {row}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0 pb-2 h-full overflow-auto">
                  {/* Step completion for project view */}
                  {currentProjectId && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Step Progress</span>
                        <span className="text-xs font-bold">
                          {/* Calculate step completion based on tasks in this step */}
                          {(() => {
                            const stepTasksForStep = stepTasks[step.id] || [];
                            const completedStepTasks = 0; // This would need to be calculated from project tasks
                            const percentage = stepTasksForStep.length > 0 ? Math.round((completedStepTasks / stepTasksForStep.length) * 100) : 0;
                            return `${percentage}%`;
                          })()}
                        </span>
                      </div>
                      <Progress 
                        value={(() => {
                          const stepTasksForStep = stepTasks[step.id] || [];
                          const completedStepTasks = 0; // This would need actual project task completion data
                          return stepTasksForStep.length > 0 ? Math.round((completedStepTasks / stepTasksForStep.length) * 100) : 0;
                        })()} 
                        className="h-1.5"
                      />
                      <div className="text-xs text-muted-foreground">
                        {stepTasks[step.id]?.length || 0} tasks in this step
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center text-xs text-muted-foreground py-2">
                    Double-click to view and edit tasks
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {selectedStep && (
        <WBSTaskDialog
          isOpen={isTaskDialogOpen}
          onClose={() => {
            setIsTaskDialogOpen(false);
            setSelectedStep(null);
          }}
          step={selectedStep}
          tasks={stepTasks[selectedStep.id] || []}
          onSave={handleTaskSave}
        />
      )}
    </div>
  );
}