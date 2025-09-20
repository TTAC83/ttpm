import { useState, useEffect, useCallback, useMemo } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RotateCcw, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { wbsService, type ImplementationProject, type ProjectStep, type WBSTask } from "@/lib/wbsService";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Add CSS for grid layout
const gridStyles = `
  .react-grid-layout {
    position: relative;
  }
  .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top;
  }
  .react-grid-item.cssTransforms {
    transition-property: transform;
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
  }
`;

const ResponsiveGridLayout = WidthProvider(Responsive);

const ZOOM_LEVELS = [50, 75, 100, 125];

export default function WBS() {
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
  const [projects, setProjects] = useState<ImplementationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [stepTasks, setStepTasks] = useState<Record<string, WBSTask[]>>({});
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({ lg: [] });
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canUpdate, setCanUpdate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WBSTask | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await wbsService.getImplementationProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load projects"
        });
      }
    };
    loadProjects();
  }, [toast]);

  // Load project data when selected
  useEffect(() => {
    if (!selectedProject) return;

    const loadProjectData = async () => {
      setLoading(true);
      try {
        const [projectSteps, savedLayouts, updatePermission] = await Promise.all([
          wbsService.getProjectSteps(selectedProject),
          wbsService.getWBSLayouts(selectedProject),
          wbsService.canUpdateLayout(selectedProject)
        ]);

        setSteps(projectSteps);
        setCanUpdate(updatePermission);

        // Load tasks for each step
        const tasksData: Record<string, WBSTask[]> = {};
        for (const step of projectSteps) {
          tasksData[step.step_name] = await wbsService.getStepTasks(selectedProject, step.step_name);
        }
        setStepTasks(tasksData);

        // Convert saved layouts to react-grid-layout format
        const layoutMap: Record<string, Layout[]> = { lg: [] };
        const savedLayoutMap = Object.fromEntries(
          savedLayouts.map(layout => [layout.step_name, layout])
        );

        projectSteps.forEach((step, index) => {
          const saved = savedLayoutMap[step.step_name];
          if (saved) {
            layoutMap.lg.push({
              i: step.step_name,
              x: saved.pos_x,
              y: saved.pos_y,
              w: saved.width,
              h: saved.height
            });
          } else {
            // Default auto layout
            layoutMap.lg.push({
              i: step.step_name,
              x: (index % 3) * 4,
              y: Math.floor(index / 3) * 4,
              w: 4,
              h: 4
            });
          }
        });

        setLayouts(layoutMap);
      } catch (error) {
        console.error("Failed to load project data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load project data"
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [selectedProject, toast]);

  const projectOptions = useMemo(() => 
    projects.map(project => ({
      value: project.id,
      label: `${project.company_name} • ${project.name}${project.site_name ? ` • ${project.site_name}` : ""}`
    }))
  , [projects]);

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    if (!canUpdate || !selectedProject) return;

    setLayouts({ lg: layout });

    // Debounced save
    const saveTimeout = setTimeout(async () => {
      try {
        for (const item of layout) {
          await wbsService.saveWBSLayout({
            project_id: selectedProject,
            step_name: item.i,
            pos_x: item.x,
            pos_y: item.y,
            width: item.w,
            height: item.h
          });
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
  }, [canUpdate, selectedProject, toast]);

  const handleResetLayout = async () => {
    if (!selectedProject) return;

    try {
      await wbsService.resetWBSLayout(selectedProject);
      
      // Reset to default layout
      const defaultLayout = steps.map((step, index) => ({
        i: step.step_name,
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 4,
        w: 4,
        h: 4
      }));
      
      setLayouts({ lg: defaultLayout });
      toast({
        title: "Layout reset",
        description: "WBS layout has been reset to default"
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

  const getStatusColor = (status: string) => {
    if (status?.toLowerCase().includes("overdue")) return "destructive";
    if (status === "Done") return "default";
    if (status === "In Progress") return "secondary";
    return "outline";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yy");
    } catch {
      return "-";
    }
  };

  const hasOverdueTasks = (stepName: string) => {
    return stepTasks[stepName]?.some(task => 
      task.status?.toLowerCase().includes("overdue")
    ) || false;
  };

  if (!selectedProject) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Work Breakdown Structure</h1>
          <p className="text-muted-foreground mt-2">
            Interactive project task management with draggable step boxes
          </p>
        </div>

        <div className="max-w-md">
          <Combobox
            options={projectOptions}
            value={selectedProject}
            onValueChange={setSelectedProject}
            placeholder="Select an implementation project..."
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Select a project to view its WBS</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Work Breakdown Structure</h1>
            <p className="text-muted-foreground mt-2">
              {projects.find(p => p.id === selectedProject)?.name || "Project"}
            </p>
          </div>
          <Combobox
            options={projectOptions}
            value={selectedProject}
            onValueChange={setSelectedProject}
            placeholder="Select project..."
            className="w-80"
          />
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">No tasks yet for this project</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Breakdown Structure</h1>
          <p className="text-muted-foreground mt-2">
            {projects.find(p => p.id === selectedProject)?.name || "Project"}
            {!canUpdate && <Badge variant="secondary" className="ml-2">Read-only</Badge>}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
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

          <Combobox
            options={projectOptions}
            value={selectedProject}
            onValueChange={setSelectedProject}
            placeholder="Select project..."
            className="w-80"
          />
        </div>
      </div>

      <div 
        className="relative border rounded-lg bg-muted/50 p-4 overflow-auto"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
      >
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          isDraggable={canUpdate}
          isResizable={canUpdate}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          rowHeight={60}
        >
          {steps.map((step) => (
            <div key={step.step_name}>
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {step.step_name}
                      {hasOverdueTasks(step.step_name) && (
                        <div className="w-2 h-2 bg-destructive rounded-full" title="Has overdue tasks" />
                      )}
                    </CardTitle>
                    <Badge variant="secondary">
                      {step.task_count} task{step.task_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 h-full overflow-auto">
                  {stepTasks[step.step_name]?.length > 0 ? (
                    <div className="space-y-2">
                      {stepTasks[step.step_name].slice(0, 10).map((task) => (
                        <div
                          key={task.id}
                          className="p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm line-clamp-1">
                              {task.task_title}
                            </p>
                            <Badge variant={getStatusColor(task.status)} className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {task.assignee_profile && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={task.assignee_profile.avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {task.assignee_profile.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-16">
                                    {task.assignee_profile.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div>{formatDate(task.planned_start)} - {formatDate(task.planned_end)}</div>
                              {task.actual_start && (
                                <div className="text-green-600">
                                  {formatDate(task.actual_start)} - {formatDate(task.actual_end)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {stepTasks[step.step_name].length > 10 && (
                        <div className="text-center text-xs text-muted-foreground pt-2">
                          +{stepTasks[step.step_name].length - 10} more tasks
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No tasks in this step
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {selectedTask && (
        <TaskEditDialog
          task={selectedTask}
          profiles={profiles}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onSave={async (taskData) => {
            // Implement task save logic here
            console.log("Saving task:", taskData);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}