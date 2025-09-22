import React, { useState, useEffect } from "react";
import { tasksService } from "@/lib/tasksService";
import { actionsService } from "@/lib/actionsService";
import { toast } from "sonner";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { EditActionDialog } from "@/components/EditActionDialog";
import CreateEventDialog from "@/components/CreateEventDialog";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { VisionModelDialog } from "@/components/VisionModelDialog";
import { FeatureRequestDialog } from "@/components/FeatureRequestDialog";
import TaskList from "@/components/TaskList";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CheckSquare, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Eye, 
  Lightbulb,
  Clock,
  AlertCircle,
  TrendingUp,
  Filter,
  Plus,
  Search
} from "lucide-react";
import { format, isAfter, isBefore, parseISO, addDays, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface Task {
  id: string;
  project_id: string;
  task_title: string;
  task_details?: string;
  status: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  assignee?: string;
  step_name: string;
  project?: {
    name: string;
    domain: string;
    company?: {
      name: string;
    };
  };
}

interface Action {
  id: string;
  title: string;
  details?: string;
  status: string;
  planned_date?: string;
  is_critical: boolean;
  assignee?: string;
  project_id?: string;
  project?: {
    name: string;
    company?: {
      name: string;
    };
  };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  project_id: string;
  project?: {
    name: string;
    company?: {
      name: string;
    };
  };
}

interface ProductGap {
  id: string;
  title: string;
  description?: string;
  status: string;
  is_critical: boolean;
  project_id: string;
  project?: {
    name: string;
    company?: {
      name: string;
    };
  };
}

interface VisionModel {
  id: string;
  product_title: string;
  description?: string;
  status: string;
  project_id: string;
  project?: {
    name: string;
    company?: {
      name: string;
    };
  };
}

interface FeatureRequest {
  id: string;
  title: string;
  status: string;
  required_date?: string;
  problem_statement?: string;
}

interface DashboardStats {
  overdueTasks: number;
  todayTasks: number;
  criticalActions: number;
  upcomingEvents: number;
}

export default function MyWork() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("tasks");
  
  // Task edit dialog states
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Action edit dialog states
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  
  // Event edit dialog states
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Product Gap drawer states
  const [isProductGapDrawerOpen, setIsProductGapDrawerOpen] = useState(false);
  const [selectedProductGap, setSelectedProductGap] = useState<any>(null);
  
  // Vision Model dialog states
  const [isVisionModelDialogOpen, setIsVisionModelDialogOpen] = useState(false);
  const [selectedVisionModel, setSelectedVisionModel] = useState<any>(null);
  
  // Feature Request dialog states
  const [isFeatureRequestDialogOpen, setIsFeatureRequestDialogOpen] = useState(false);
  const [selectedFeatureRequest, setSelectedFeatureRequest] = useState<any>(null);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [productGaps, setProductGaps] = useState<ProductGap[]>([]);
  const [visionModels, setVisionModels] = useState<VisionModel[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    overdueTasks: 0,
    todayTasks: 0,
    criticalActions: 0,
    upcomingEvents: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Fetch profiles for the task dialog
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name');
        
        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };

    fetchProfiles();
  }, []);
  
  useEffect(() => {
    if (user) {
      fetchMyWork();
    }
  }, [user]);

  // Unified fetch function to refresh all data
  const fetchData = () => {
    if (user) {
      fetchMyWork();
    }
  };
  useEffect(() => {
    if (user) {
      fetchMyWork();
    }
  }, [user]);

  const fetchMyWork = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch tasks assigned to user
      const { data: tasksData } = await supabase
        .from('project_tasks')
        .select(`
          *,
          project:projects(name, domain, company:companies(name))
        `)
        .eq('assignee', user.id);

      // Fetch actions assigned to user
      const { data: actionsData } = await supabase
        .from('actions')
        .select(`
          *,
          project:projects(name, company:companies(name))
        `)
        .eq('assignee', user.id);

      // Fetch events for user's projects
      const { data: eventsData } = await supabase
        .from('project_events')
        .select(`
          *,
          project:projects(name, company:companies(name))
        `)
        .gte('start_date', new Date().toISOString().split('T')[0]);

      // Fetch product gaps for user's projects  
      const { data: productGapsData } = await supabase
        .from('product_gaps')
        .select(`
          *,
          project:projects(name, company:companies(name))
        `)
        .neq('status', 'Closed');

      // Fetch vision models for user's projects
      const { data: visionModelsData } = await supabase
        .from('vision_models')
        .select(`
          *,
          project:projects(name, company:companies(name))
        `);

      // Fetch feature requests (internal users only)
      const { data: featureRequestsData } = await supabase
        .from('feature_requests')
        .select('*')
        .neq('status', 'Complete');

      setTasks(tasksData || []);
      setActions(actionsData || []);
      setEvents((eventsData || []) as any);
      setProductGaps((productGapsData || []) as any);
      setVisionModels((visionModelsData || []) as any);
      setFeatureRequests(featureRequestsData || []);

      // Calculate stats
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      const overdueTasks = (tasksData || []).filter(task => 
        task.planned_end && 
        isBefore(parseISO(task.planned_end), today) && 
        task.status !== 'Done'
      ).length;

      const todayTasks = (tasksData || []).filter(task =>
        task.planned_start === todayStr || task.planned_end === todayStr
      ).length;

      const criticalActions = (actionsData || []).filter(action => 
        action.is_critical && action.status === 'Open'
      ).length;

      const upcomingEvents = (eventsData || []).filter(event =>
        isAfter(parseISO(event.start_date), subDays(today, 1)) &&
        isBefore(parseISO(event.start_date), addDays(today, 7))
      ).length;

      setStats({
        overdueTasks,
        todayTasks,
        criticalActions,
        upcomingEvents
      });

    } catch (error) {
      console.error('Error fetching my work data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = (date: string | undefined) => {
    if (!date || !dateRange?.from) return true;
    const itemDate = parseISO(date);
    if (dateRange.from && isBefore(itemDate, dateRange.from)) return false;
    if (dateRange.to && isAfter(itemDate, dateRange.to)) return false;
    return true;
  };

  const filterBySearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'closed':
      case 'complete':
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in progress':
      case 'open':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
      case 'on hold':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (date: string | undefined) => {
    if (!date) return false;
    return isBefore(parseISO(date), new Date());
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your work...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Work</h1>
          <p className="text-muted-foreground">Your personal dashboard for tasks, actions, and assignments</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Quick Add
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Tasks</p>
                <p className="text-2xl font-bold text-blue-600">{stats.todayTasks}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Actions</p>
                <p className="text-2xl font-bold text-orange-600">{stats.criticalActions}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold text-green-600">{stats.upcomingEvents}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search across all items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => {
              setSearchQuery("");
              setDateRange(undefined);
              setStatusFilter("all");
              setPriorityFilter("all");
            }}>
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Actions ({actions.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Product Gaps ({productGaps.length})
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Vision Models ({visionModels.length})
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Features ({featureRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <TaskList 
            tasks={tasks}
            filterBySearch={filterBySearch}
            filterByDateRange={filterByDateRange}
            setSelectedTask={setSelectedTask}
            setIsTaskDialogOpen={setIsTaskDialogOpen}
          />
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {actions
            .filter(action => {
              const isCompleted = action.status?.toLowerCase() === 'done' || action.status?.toLowerCase() === 'closed';
              return !isCompleted;
            })
            .filter(action => filterBySearch(action.title + ' ' + (action.details || '')))
            .filter(action => filterByDateRange(action.planned_date))
            .map((action) => (
              <Card key={action.id} className={cn(
                "transition-shadow hover:shadow-md",
                action.is_critical && "border-orange-200 bg-orange-50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{action.title}</h3>
                        <Badge className={getStatusColor(action.status)}>{action.status}</Badge>
                        {action.is_critical && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{action.details}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Customer: {action.project?.company?.name || 'N/A'}</span>
                        {action.project?.name && <span>Project: {action.project.name}</span>}
                        {action.planned_date && <span>Due: {format(parseISO(action.planned_date), 'MMM dd')}</span>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedAction(action);
                      setIsActionDialogOpen(true);
                    }}>
                      Edit Action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {events
            .filter(event => filterBySearch(event.title + ' ' + (event.description || '')))
            .filter(event => filterByDateRange(event.start_date))
            .map((event) => (
              <Card key={event.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Customer: {event.project?.company?.name || 'N/A'}</span>
                        <span>Project: {event.project?.name}</span>
                        <span>Start: {format(parseISO(event.start_date), 'MMM dd, yyyy')}</span>
                        {event.end_date && <span>End: {format(parseISO(event.end_date), 'MMM dd, yyyy')}</span>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedEvent(event);
                      setIsEventDialogOpen(true);
                    }}>
                      Edit Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Product Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {productGaps
            .filter(gap => filterBySearch(gap.title + ' ' + (gap.description || '')))
            .map((gap) => (
              <Card key={gap.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{gap.title}</h3>
                        <Badge className={getStatusColor(gap.status)}>{gap.status}</Badge>
                        {gap.is_critical && <Badge variant="destructive">Critical</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{gap.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Customer: {gap.project?.company?.name || 'N/A'}</span>
                        <span>Project: {gap.project?.name}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedProductGap(gap);
                      setIsProductGapDrawerOpen(true);
                    }}>
                      Edit Gap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Vision Models Tab */}
        <TabsContent value="models" className="space-y-4">
          {visionModels
            .filter(model => filterBySearch(model.product_title + ' ' + (model.description || '')))
            .map((model) => (
              <Card key={model.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{model.product_title}</h3>
                        <Badge className={getStatusColor(model.status)}>{model.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Customer: {model.project?.company?.name || 'N/A'}</span>
                        <span>Project: {model.project?.name}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedVisionModel(model);
                      setIsVisionModelDialogOpen(true);
                    }}>
                      Edit Model
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Feature Requests Tab */}
        <TabsContent value="features" className="space-y-4">
          {featureRequests
            .filter(feature => filterBySearch(feature.title + ' ' + (feature.problem_statement || '')))
            .filter(feature => filterByDateRange(feature.required_date))
            .map((feature) => (
              <Card key={feature.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{feature.title}</h3>
                        <Badge className={getStatusColor(feature.status)}>{feature.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{feature.problem_statement}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {feature.required_date && <span>Required: {format(parseISO(feature.required_date), 'MMM dd, yyyy')}</span>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedFeatureRequest(feature);
                      setIsFeatureRequestDialogOpen(true);
                    }}>
                      Edit Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* Task Edit Dialog */}
      {selectedTask && (
        <TaskEditDialog
          task={selectedTask}
          profiles={profiles}
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          onSave={async (updatedTask) => {
            try {
              // Save to database first
              await tasksService.updateTask(updatedTask.id, {
                task_title: updatedTask.task_title,
                task_details: updatedTask.task_details,
                planned_start: updatedTask.planned_start,
                planned_end: updatedTask.planned_end,
                actual_start: updatedTask.actual_start,
                actual_end: updatedTask.actual_end,
                status: updatedTask.status as "In Progress" | "Done" | "Planned" | "Blocked",
                assignee: updatedTask.assignee,
              });
              
              // Update local state only after successful save
              setTasks(prevTasks => 
                prevTasks.map(task => 
                  task.id === updatedTask.id ? { ...task, ...updatedTask } : task
                )
              );
              toast.success('Task updated successfully');
              setIsTaskDialogOpen(false);
            } catch (error) {
              console.error('Failed to save task:', error);
              toast.error('Failed to save task changes. Please try again.');
            }
          }}
        />
      )}

      {/* Action Edit Dialog */}
      {selectedAction && (
        <EditActionDialog
          action={selectedAction}
          profiles={profiles}
          open={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          onSave={async (updatedAction) => {
            try {
              await actionsService.updateAction(selectedAction.id, updatedAction);
              setIsActionDialogOpen(false);
              fetchData(); // Refresh data from database
            } catch (error) {
              console.error('Failed to update action:', error);
              toast.error('Failed to update action');
            }
          }}
        />
      )}

      {/* Event Edit Dialog - Using CreateEventDialog in edit mode */}
      {selectedEvent && (
        <CreateEventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          projectId={selectedEvent.project_id}
          onEventCreated={() => {
            setIsEventDialogOpen(false);
            fetchData();
          }}
        />
      )}

      {/* Product Gap Drawer */}
      {selectedProductGap && (
        <ProductGapDrawer
          projectId={selectedProductGap?.project_id}
          productGap={selectedProductGap}
          open={isProductGapDrawerOpen}
          onOpenChange={setIsProductGapDrawerOpen}
          onSuccess={() => {
            setIsProductGapDrawerOpen(false);
            fetchData();
          }}
        />
      )}

      {/* Vision Model Dialog */}
      {selectedVisionModel && (
        <VisionModelDialog
          open={isVisionModelDialogOpen}
          onOpenChange={setIsVisionModelDialogOpen}
          onClose={() => {
            setIsVisionModelDialogOpen(false);
            fetchData();
          }}
          projectId={selectedVisionModel?.project_id}
          model={selectedVisionModel}
          mode="edit"
        />
      )}

      {/* Feature Request Dialog */}
      {selectedFeatureRequest && (
        <FeatureRequestDialog
          open={isFeatureRequestDialogOpen}
          onOpenChange={setIsFeatureRequestDialogOpen}
          featureRequest={selectedFeatureRequest}
          onSuccess={() => {
            setIsFeatureRequestDialogOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}