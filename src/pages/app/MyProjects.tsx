import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { fetchMyProjectsData } from "@/lib/myProjectsService";
import { exportExecutiveSummaryToPDF } from "@/lib/executiveSummaryExportService";
import { blockersService, ImplementationBlocker } from "@/lib/blockersService";
import { productGapsService, ProductGap } from "@/lib/productGapsService";
import { featureRequestsService, FeatureRequestWithProfile } from "@/lib/featureRequestsService";
import { calculateMultipleProjectCompletions, ProjectCompletion } from "@/lib/projectCompletionService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Smile, Frown, Bug, TrendingUp, TrendingDown, AlertTriangle, Hammer, GraduationCap, Rocket, FileDown, Calendar, ListTodo, CheckCircle2, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { BlockerDrawer } from "@/components/BlockerDrawer";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { EditActionDialog } from "@/components/EditActionDialog";
import { formatDateUK } from "@/lib/dateUtils";
import { toast } from "sonner";

export default function MyProjects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  
  // Drawer states
  const [selectedEscalation, setSelectedEscalation] = useState<ImplementationBlocker | undefined>();
  const [escalationDrawerOpen, setEscalationDrawerOpen] = useState(false);
  const [selectedProductGap, setSelectedProductGap] = useState<ProductGap | undefined>();
  const [productGapDrawerOpen, setProductGapDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  
  // Multi-select state for tasks
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['my-projects-summary', user?.id, showAll],
    queryFn: () => fetchMyProjectsData(user!.id, showAll),
    enabled: !!user?.id,
  });

  // Get project IDs for filtering related data
  const myProjectIds = useMemo(() => summaryData.map(p => p.project_id), [summaryData]);

  // Fetch completion percentages for all projects
  const { data: completionData = new Map<string, ProjectCompletion>() } = useQuery({
    queryKey: ['my-projects-completion', myProjectIds],
    queryFn: () => calculateMultipleProjectCompletions(myProjectIds),
    enabled: myProjectIds.length > 0,
  });

  // Fetch escalations (Live only, filtered to my projects)
  const { data: escalations = [], isLoading: escalationsLoading } = useQuery({
    queryKey: ['my-projects-escalations', myProjectIds],
    queryFn: async () => {
      const allEscalations = await blockersService.getAllBlockers({ status: 'Live' });
      return allEscalations.filter(e => myProjectIds.includes(e.project_id || ''));
    },
    enabled: myProjectIds.length > 0,
  });

  // Fetch product gaps (Live only, filtered to my projects)
  const { data: productGaps = [], isLoading: productGapsLoading } = useQuery({
    queryKey: ['my-projects-product-gaps', myProjectIds],
    queryFn: async () => {
      const allGaps = await productGapsService.getAllProductGaps();
      return allGaps.filter(g => g.status === 'Live' && myProjectIds.includes(g.project_id || ''));
    },
    enabled: myProjectIds.length > 0,
  });

  // Fetch open feature requests (not Complete or Rejected)
  const { data: featureRequests = [], isLoading: featureRequestsLoading } = useQuery({
    queryKey: ['my-projects-feature-requests'],
    queryFn: async () => {
      return await featureRequestsService.getFeatureRequests({
        statuses: ['Requested', 'In Design', 'In Dev'],
        pageSize: 100
      });
    },
  });

  // Fetch actions (critical or overdue, filtered to my projects)
  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['my-projects-actions', myProjectIds],
    queryFn: async () => {
      const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          profiles:assignee(name),
          projects:project_id(name, companies:company_id(name))
        `)
        .in('project_id', myProjectIds)
        .or(`is_critical.eq.true,and(planned_date.lt.${ukToday})`)
        .neq('status', 'Done')
        .order('is_critical', { ascending: false })
        .order('planned_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: myProjectIds.length > 0,
  });

  // Fetch upcoming events (start_date >= today, filtered to my projects)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['my-projects-events', myProjectIds],
    queryFn: async () => {
      const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const { data, error } = await supabase
        .from('project_events')
        .select(`
          *,
          projects:project_id(name, companies:company_id(name))
        `)
        .in('project_id', myProjectIds)
        .gte('start_date', ukToday)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(event => ({
        ...event,
        project_name: event.projects?.name || 'Unknown',
        company_name: event.projects?.companies?.name || 'Unknown'
      }));
    },
    enabled: myProjectIds.length > 0,
  });

  // Fetch blocked or overdue tasks (filtered to my projects)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['my-projects-tasks', myProjectIds],
    queryFn: async () => {
      const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          id,
          task_title,
          task_details,
          planned_start,
          planned_end,
          status,
          assignee,
          project_id,
          projects:project_id(name, companies:company_id(name)),
          profiles:assignee(name)
        `)
        .in('project_id', myProjectIds)
        .or(`status.eq.Blocked,and(planned_end.lt.${ukToday})`)
        .neq('status', 'Done')
        .order('status', { ascending: false })
        .order('planned_end', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(task => {
        const isOverdue = task.planned_end ? task.planned_end < ukToday : false;
        return {
          ...task,
          project_name: task.projects?.name || 'Unknown',
          company_name: task.projects?.companies?.name || 'Unknown',
          assignee_name: task.profiles?.name || null,
          is_overdue: isOverdue,
          is_critical: task.status === 'Blocked'
        };
      });
    },
    enabled: myProjectIds.length > 0,
  });

  // Fetch profiles for action editing
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Handle action save
  const handleActionSave = async (actionData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-action', {
        body: {
          id: selectedAction?.id,
          ...actionData,
          isUpdate: true,
        },
      });
      if (error) throw error;
      setActionDialogOpen(false);
      setSelectedAction(null);
      queryClient.invalidateQueries({ queryKey: ['my-projects-actions'] });
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  // Handle bulk mark complete for tasks
  const handleBulkMarkComplete = async () => {
    if (selectedTaskIds.size === 0) return;
    
    setIsMarkingComplete(true);
    try {
      const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const taskIdsArray = Array.from(selectedTaskIds);
      
      // Update each task using the edge function
      const results = await Promise.all(
        taskIdsArray.map(async (taskId) => {
          const { error } = await supabase.functions.invoke('update-task', {
            body: {
              id: taskId,
              status: 'Done',
              actual_end: ukToday
            }
          });
          return { taskId, error };
        })
      );
      
      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
        toast.error(`Failed to update ${failed.length} task(s)`);
      } else {
        toast.success(`Marked ${taskIdsArray.length} task(s) as complete`);
      }
      
      setSelectedTaskIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['my-projects-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-projects-completion'] });
    } catch (error) {
      console.error('Error marking tasks complete:', error);
      toast.error('Failed to mark tasks as complete');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Toggle all tasks selection
  const toggleAllTasks = (tasks: any[]) => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  };

  // Filter data based on search
  const filteredData = summaryData.filter(row => 
    row.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get filtered project IDs for filtering related tables
  const filteredProjectIds = useMemo(() => new Set(filteredData.map(p => p.project_id)), [filteredData]);

  // Filter escalations based on search
  const filteredEscalations = useMemo(() => 
    escalations.filter(e => filteredProjectIds.has(e.project_id || '')),
    [escalations, filteredProjectIds]
  );

  // Filter actions based on search
  const filteredActions = useMemo(() => 
    actions.filter(a => filteredProjectIds.has(a.project_id || '')),
    [actions, filteredProjectIds]
  );

  // Filter product gaps based on search
  const filteredProductGaps = useMemo(() => 
    productGaps.filter(g => filteredProjectIds.has(g.project_id || '')),
    [productGaps, filteredProjectIds]
  );

  // Filter feature requests based on search (search by title or problem statement)
  const filteredFeatureRequests = useMemo(() => 
    featureRequests.filter(fr => 
      fr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fr.problem_statement?.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [featureRequests, searchQuery]
  );

  // Filter events based on search
  const filteredEvents = useMemo(() => 
    events.filter(e => filteredProjectIds.has(e.project_id || '')),
    [events, filteredProjectIds]
  );

  // Filter tasks based on search
  const filteredTasks = useMemo(() => 
    tasks.filter(t => filteredProjectIds.has(t.project_id || '')),
    [tasks, filteredProjectIds]
  );

  // Compute stats from summary data
  const stats = useMemo(() => {
    const total = summaryData.length;
    const greenHealth = summaryData.filter(r => r.customer_health === 'green').length;
    const redHealth = summaryData.filter(r => r.customer_health === 'red').length;
    const noHealth = total - greenHealth - redHealth;
    
    const onTrack = summaryData.filter(r => r.project_on_track === 'on_track').length;
    const offTrack = summaryData.filter(r => r.project_on_track === 'off_track').length;
    const noStatus = total - onTrack - offTrack;
    
    const installation = summaryData.filter(r => r.phase_installation).length;
    const onboarding = summaryData.filter(r => r.phase_onboarding).length;
    const live = summaryData.filter(r => r.phase_live).length;
    
    const productGapsCritical = summaryData.filter(r => r.product_gaps_status === 'critical').length;
    const productGapsNonCritical = summaryData.filter(r => r.product_gaps_status === 'non_critical').length;
    
    const escalationsCritical = summaryData.filter(r => r.escalation_status === 'critical').length;
    const escalationsActive = summaryData.filter(r => r.escalation_status === 'active').length;
    
    return {
      total,
      greenHealth,
      redHealth,
      noHealth,
      onTrack,
      offTrack,
      noStatus,
      installation,
      onboarding,
      live,
      productGapsCritical,
      productGapsNonCritical,
      escalationsCritical,
      escalationsActive
    };
  }, [summaryData]);

  // Sort data
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Default sort: escalation status priority, then planned go-live date
  const getEscalationPriority = (status: 'none' | 'active' | 'critical') => {
    if (status === 'critical') return 0;
    if (status === 'active') return 1;
    return 2;
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn) {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }

    const escPriorityA = getEscalationPriority(a.escalation_status);
    const escPriorityB = getEscalationPriority(b.escalation_status);

    if (escPriorityA !== escPriorityB) {
      return escPriorityA - escPriorityB;
    }

    const dateA = a.planned_go_live_date ? new Date(a.planned_go_live_date).getTime() : Infinity;
    const dateB = b.planned_go_live_date ? new Date(b.planned_go_live_date).getTime() : Infinity;
    return dateA - dateB;
  });

  const projectOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedData.forEach((row, index) => {
      map.set(row.project_id, index);
    });
    return map;
  }, [sortedData]);

  const handleRowClick = (projectId: string) => {
    navigate(`/app/projects/${projectId}`);
  };

  const renderHealthIcon = (health: 'green' | 'red' | null) => {
    if (health === 'green') return <Smile className="h-6 w-6 text-green-600" />;
    if (health === 'red') return <Frown className="h-6 w-6 text-red-600" />;
    return null;
  };

  const renderOnTrackIcon = (status: 'on_track' | 'off_track' | null) => {
    if (status === 'on_track') return <TrendingUp className="h-6 w-6 text-green-600" />;
    if (status === 'off_track') return <TrendingDown className="h-6 w-6 text-red-600" />;
    return null;
  };

  const renderProductGapsIcon = (status: 'none' | 'non_critical' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') return <Bug className="h-6 w-6 text-red-600" />;
    return <Bug className="h-6 w-6 text-green-600" />;
  };

  const renderEscalationIcon = (status: 'none' | 'active' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') return <AlertTriangle className="h-6 w-6 text-red-600" />;
    return <AlertTriangle className="h-6 w-6 text-foreground" />;
  };

  const renderPhaseIcon = (phase: 'installation' | 'onboarding' | 'live', isActive: boolean | null) => {
    if (!isActive) return null;
    switch (phase) {
      case 'installation': return <Hammer className="h-5 w-5 text-orange-500" />;
      case 'onboarding': return <GraduationCap className="h-5 w-5 text-blue-500" />;
      case 'live': return <Rocket className="h-5 w-5 text-green-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">Projects where you have a team role assigned</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => exportExecutiveSummaryToPDF({
            summaryData: sortedData,
            escalations,
            productGaps,
            actions,
            events,
            featureRequests
          })}
          disabled={isLoading}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by customer or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="show-all"
            checked={showAll}
            onCheckedChange={setShowAll}
          />
          <Label htmlFor="show-all" className="text-sm text-muted-foreground cursor-pointer">
            Show All Projects
          </Label>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">My Projects</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-green-600 font-semibold">{stats.greenHealth}</span>
              {" / "}
              <span className="text-red-600 font-semibold">{stats.redHealth}</span>
              {" / "}
              <span className="text-muted-foreground">{stats.noHealth}</span>
            </div>
            <div className="text-sm text-muted-foreground">Health (G/R/–)</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-green-600 font-semibold">{stats.onTrack}</span>
              {" / "}
              <span className="text-red-600 font-semibold">{stats.offTrack}</span>
              {" / "}
              <span className="text-muted-foreground">{stats.noStatus}</span>
            </div>
            <div className="text-sm text-muted-foreground">On Track (Y/N/–)</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg flex justify-center gap-2">
              <span className="flex items-center gap-1">
                <Hammer className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{stats.installation}</span>
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{stats.onboarding}</span>
              </span>
              <span className="flex items-center gap-1">
                <Rocket className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{stats.live}</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Phases</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-red-600 font-semibold">{stats.productGapsCritical}</span>
              {" / "}
              <span className="text-green-600 font-semibold">{stats.productGapsNonCritical}</span>
            </div>
            <div className="text-sm text-muted-foreground">Product Gaps (Crit/Non)</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-red-600 font-semibold">{stats.escalationsCritical}</span>
              {" / "}
              <span className="text-foreground font-semibold">{stats.escalationsActive}</span>
            </div>
            <div className="text-sm text-muted-foreground">Escalations (Crit/Active)</div>
          </div>
        </div>
      </Card>

      {summaryData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">You don't have any projects assigned yet.</p>
            <p className="text-sm mt-2">Projects will appear here when you're assigned a team role.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b-0">
                  <TableHead colSpan={4} className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r">
                    Project Details
                  </TableHead>
                  <TableHead colSpan={2} className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r">
                    Escalations
                  </TableHead>
                  <TableHead colSpan={3} className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r">
                    Weekly Review
                  </TableHead>
                  <TableHead colSpan={3} className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r">
                    Status
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Product Gaps
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50 border-r-0" onClick={() => handleSort('customer_name')}>
                    Customer {sortColumn === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('project_name')}>
                    Project {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('planned_go_live_date')}>
                    Go Live {sortColumn === 'planned_go_live_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="border-r w-24">% Complete</TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('escalation_status')}>
                    {sortColumn === 'escalation_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="border-r">Reason</TableHead>
                  <TableHead className="text-center">Health</TableHead>
                  <TableHead className="text-center">On Track</TableHead>
                  <TableHead className="border-r">Reason</TableHead>
                  <TableHead className="text-center"><Hammer className="h-4 w-4 mx-auto text-orange-500" /></TableHead>
                  <TableHead className="text-center"><GraduationCap className="h-4 w-4 mx-auto text-blue-500" /></TableHead>
                  <TableHead className="text-center border-r"><Rocket className="h-4 w-4 mx-auto text-green-500" /></TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('product_gaps_status')}>
                    {sortColumn === 'product_gaps_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row) => (
                  <TableRow
                    key={row.project_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(row.project_id)}
                  >
                    <TableCell className="font-medium">{row.customer_name}</TableCell>
                    <TableCell>{row.project_name}</TableCell>
                    <TableCell>
                      {row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yy') : ''}
                    </TableCell>
                    <TableCell className="border-r">
                      {(() => {
                        const completion = completionData.get(row.project_id);
                        const pct = completion?.completionPercentage ?? 0;
                        return (
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 w-12" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{pct}%</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">{renderEscalationIcon(row.escalation_status)}</TableCell>
                    <TableCell className="border-r text-sm">
                      {escalations.filter(e => e.project_id === row.project_id).map(e => e.reason_code).filter(Boolean).join(', ')}
                    </TableCell>
                    <TableCell className="text-center">{renderHealthIcon(row.customer_health)}</TableCell>
                    <TableCell className="text-center">{renderOnTrackIcon(row.project_on_track)}</TableCell>
                    <TableCell className="border-r">{row.reason_code || ''}</TableCell>
                    <TableCell className="text-center">{renderPhaseIcon('installation', row.phase_installation)}</TableCell>
                    <TableCell className="text-center">{renderPhaseIcon('onboarding', row.phase_onboarding)}</TableCell>
                    <TableCell className="text-center border-r">{renderPhaseIcon('live', row.phase_live)}</TableCell>
                    <TableCell className="text-center">{renderProductGapsIcon(row.product_gaps_status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Escalations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Escalations ({filteredEscalations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {escalationsLoading ? (
                <div className="p-4 text-muted-foreground">Loading escalations...</div>
              ) : filteredEscalations.length === 0 ? (
                <div className="p-4 text-muted-foreground">No live escalations.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Reason Code</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Raised</TableHead>
                      <TableHead>Est. Complete</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredEscalations]
                      .sort((a, b) => {
                        const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                        const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                        return orderA - orderB;
                      })
                      .map((esc) => (
                        <TableRow 
                          key={esc.id}
                          className={esc.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : ""}
                        >
                          <TableCell className="font-medium">{esc.customer_name}</TableCell>
                          <TableCell>{esc.project_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{esc.title}</span>
                              {esc.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{esc.reason_code || '-'}</TableCell>
                          <TableCell>{esc.owner_name}</TableCell>
                          <TableCell>{formatDateUK(esc.raised_at)}</TableCell>
                          <TableCell>{esc.estimated_complete_date ? formatDateUK(esc.estimated_complete_date) : '-'}</TableCell>
                          <TableCell className={esc.is_overdue ? "text-red-600 font-medium" : ""}>{esc.age_days}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEscalation(esc);
                                setEscalationDrawerOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Actions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Actions - Critical & Overdue ({filteredActions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {actionsLoading ? (
                <div className="p-4 text-muted-foreground">Loading actions...</div>
              ) : filteredActions.length === 0 ? (
                <div className="p-4 text-muted-foreground">No critical or overdue actions.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Planned Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredActions]
                      .sort((a, b) => {
                        const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                        const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                        return orderA - orderB;
                      })
                      .map((action) => {
                        const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
                        const isOverdue = action.planned_date && action.planned_date < ukToday;
                        return (
                          <TableRow 
                            key={action.id}
                            className={action.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : isOverdue ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                          >
                            <TableCell className="font-medium">{action.projects?.companies?.name || '-'}</TableCell>
                            <TableCell>{action.projects?.name || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{action.title}</span>
                                {action.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>{action.profiles?.name || '-'}</TableCell>
                            <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                              {action.planned_date ? formatDateUK(action.planned_date) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={action.status === 'Done' ? 'default' : 'secondary'}>
                                {action.status?.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAction(action);
                                  setActionDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Product Gaps Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Product Gaps ({filteredProductGaps.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {productGapsLoading ? (
                <div className="p-4 text-muted-foreground">Loading product gaps...</div>
              ) : filteredProductGaps.length === 0 ? (
                <div className="p-4 text-muted-foreground">No live product gaps.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Product Gap</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Est. Complete</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredProductGaps]
                      .sort((a, b) => {
                        const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                        const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                        return orderA - orderB;
                      })
                      .map((gap) => (
                        <TableRow 
                          key={gap.id}
                          className={gap.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : ""}
                        >
                          <TableCell className="font-medium">{gap.company_name}</TableCell>
                          <TableCell>{gap.project_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{gap.title}</span>
                              {gap.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{gap.assigned_to_name || '-'}</TableCell>
                          <TableCell>
                            {gap.estimated_complete_date ? formatDateUK(gap.estimated_complete_date) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={gap.is_critical ? "destructive" : "default"}>
                              {gap.is_critical ? "Critical" : "Live"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductGap(gap);
                                setProductGapDrawerOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Open Features Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Open Features ({filteredFeatureRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {featureRequestsLoading ? (
                <div className="p-4 text-muted-foreground">Loading feature requests...</div>
              ) : filteredFeatureRequests.length === 0 ? (
                <div className="p-4 text-muted-foreground">No open feature requests.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Problem Statement</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Required Date</TableHead>
                      <TableHead>Product Gaps</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeatureRequests.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium">{feature.title}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {feature.problem_statement || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={featureRequestsService.getStatusBadgeVariant(feature.status)}>
                            {feature.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {feature.required_date ? formatDateUK(feature.required_date) : '-'}
                        </TableCell>
                        <TableCell>
                          {(feature.product_gaps_total ?? 0) > 0 ? (
                            <div className="flex items-center gap-1">
                              <span>{feature.product_gaps_total}</span>
                              {(feature.product_gaps_critical ?? 0) > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {feature.product_gaps_critical} critical
                                </Badge>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{feature.creator?.name || '-'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/app/feature-requests/${feature.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Upcoming Events ({filteredEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {eventsLoading ? (
                <div className="p-4 text-muted-foreground">Loading events...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-4 text-muted-foreground">No upcoming events.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredEvents]
                      .sort((a, b) => {
                        const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                        const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                        return orderA - orderB;
                      })
                      .map((event) => (
                        <TableRow 
                          key={event.id}
                          className={event.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : ""}
                        >
                          <TableCell className="font-medium">{event.company_name}</TableCell>
                          <TableCell>{event.project_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{event.title}</span>
                              {event.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{formatDateUK(event.start_date)}</TableCell>
                          <TableCell>{formatDateUK(event.end_date)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/app/projects/${event.project_id}?tab=calendar`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-purple-500" />
                Tasks - Blocked & Overdue ({filteredTasks.length})
              </CardTitle>
              {selectedTaskIds.size > 0 && (
                <Button
                  onClick={handleBulkMarkComplete}
                  disabled={isMarkingComplete}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isMarkingComplete ? 'Marking...' : `Mark Complete (${selectedTaskIds.size})`}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {tasksLoading ? (
                <div className="p-4 text-muted-foreground">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-4 text-muted-foreground">No blocked or overdue tasks.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                          onCheckedChange={() => toggleAllTasks(filteredTasks)}
                          aria-label="Select all tasks"
                        />
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Planned End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredTasks]
                      .sort((a, b) => {
                        const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                        const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                        return orderA - orderB;
                      })
                      .map((task) => (
                        <TableRow 
                          key={task.id}
                          className={task.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : task.is_overdue ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTaskIds.has(task.id)}
                              onCheckedChange={() => toggleTaskSelection(task.id)}
                              aria-label={`Select ${task.task_title}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{task.company_name}</TableCell>
                          <TableCell>{task.project_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{task.task_title}</span>
                              {task.is_critical && <Badge variant="destructive" className="text-xs">BLOCKED</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{task.assignee_name || '-'}</TableCell>
                          <TableCell className={task.is_overdue ? "text-red-600 font-medium" : ""}>
                            {task.planned_end ? formatDateUK(task.planned_end) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.status === 'Blocked' ? 'destructive' : 'secondary'}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/app/projects/${task.project_id}?tab=tasks`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Drawers */}
      {selectedEscalation && (
        <BlockerDrawer
          open={escalationDrawerOpen}
          onOpenChange={setEscalationDrawerOpen}
          projectId={selectedEscalation.project_id || ''}
          blocker={selectedEscalation}
          onSuccess={() => {
            setEscalationDrawerOpen(false);
            setSelectedEscalation(undefined);
            queryClient.invalidateQueries({ queryKey: ['my-projects-escalations'] });
            queryClient.invalidateQueries({ queryKey: ['my-projects-summary'] });
          }}
        />
      )}

      <ProductGapDrawer
        open={productGapDrawerOpen}
        onOpenChange={setProductGapDrawerOpen}
        productGap={selectedProductGap}
        onSuccess={() => {
          setProductGapDrawerOpen(false);
          setSelectedProductGap(undefined);
          queryClient.invalidateQueries({ queryKey: ['my-projects-product-gaps'] });
          queryClient.invalidateQueries({ queryKey: ['my-projects-summary'] });
        }}
      />

      {selectedAction && (
        <EditActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          action={selectedAction}
          profiles={profiles}
          onSave={handleActionSave}
        />
      )}
    </div>
  );
}
