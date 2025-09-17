import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { blockersService } from "@/lib/blockersService";
import { productGapsService, DashboardProductGap } from "@/lib/productGapsService";
import { actionsService, DashboardAction } from "@/lib/actionsService";
import { tasksService, DashboardTask } from "@/lib/tasksService";
import { formatDateUK } from "@/lib/dateUtils";
import { BlockerDrawer } from "@/components/BlockerDrawer";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { EditActionDialog } from "@/components/EditActionDialog";
import SubtasksDialog from "@/components/SubtasksDialog";

interface DashboardBlocker {
  id: string;
  project_id: string;
  project_name: string;
  customer_name: string;
  title: string;
  estimated_complete_date?: string;
  age_days: number;
  is_overdue: boolean;
  status: string;
  reason_code?: string;
  is_critical: boolean;
  raised_at: string;
  owner: string;
  created_by?: string;
  updated_at?: string;
  description?: string;
  closed_at?: string;
  resolution_notes?: string;
}

type DashboardItem = (DashboardBlocker & { type: 'blocker' }) | (DashboardProductGap & { type: 'product_gap', customer_name: string, is_overdue: boolean });

export function BlockersDashboardCard() {
  const [blockers, setBlockers] = useState<DashboardBlocker[]>([]);
  const [productGaps, setProductGaps] = useState<DashboardProductGap[]>([]);
  const [actions, setActions] = useState<DashboardAction[]>([]);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<DashboardBlocker | undefined>();
  const [productGapDrawerOpen, setProductGapDrawerOpen] = useState(false);
  const [selectedProductGap, setSelectedProductGap] = useState<DashboardProductGap | undefined>();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<DashboardAction | undefined>();
  const [subtasksDialogOpen, setSubtasksDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DashboardTask | undefined>();
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load profiles first
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name');
      
      setProfiles(profilesData || []);

      const [blockersData, productGapsData, actionsData, tasksData] = await Promise.all([
        blockersService.getDashboardBlockers(),
        productGapsService.getDashboardProductGaps(),
        actionsService.getDashboardActions(),
        tasksService.getDashboardTasks()
      ]);
      
      setBlockers(blockersData.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return b.age_days - a.age_days;
      }) as DashboardBlocker[]);
      
      setProductGaps(productGapsData.sort((a, b) => {
        const aOverdue = a.estimated_complete_date && new Date(a.estimated_complete_date) < new Date();
        const bOverdue = b.estimated_complete_date && new Date(b.estimated_complete_date) < new Date();
        
        if (a.is_critical && !b.is_critical) return -1;
        if (!a.is_critical && b.is_critical) return 1;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return b.age_days - a.age_days;
      }));

      setActions(actionsData.sort((a, b) => {
        if (a.is_critical && !b.is_critical) return -1;
        if (!a.is_critical && b.is_critical) return 1;
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return 0;
      }));

      setTasks(tasksData.sort((a, b) => {
        if (a.is_critical && !b.is_critical) return -1;
        if (!a.is_critical && b.is_critical) return 1;
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return 0;
      }));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBlocker = (blocker: DashboardBlocker) => {
    setSelectedBlocker(blocker);
    setDrawerOpen(true);
  };


  const getProductGapStatusBadge = (gap: DashboardProductGap) => {
    const isOverdue = gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date();
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    return (
      <Badge variant={gap.is_critical ? "destructive" : "default"}>
        {gap.is_critical ? "Critical" : "Live"}
      </Badge>
    );
  };

  const getActionStatusBadge = (action: DashboardAction) => {
    if (action.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return (
      <Badge variant={action.is_critical ? "destructive" : "default"}>
        {action.is_critical ? "Critical" : action.status}
      </Badge>
    );
  };

  const getTaskStatusBadge = (task: DashboardTask) => {
    if (task.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return (
      <Badge variant={task.is_critical ? "destructive" : "default"}>
        {task.is_critical ? "Blocked" : task.status}
      </Badge>
    );
  };

  const getRowClassName = (isOverdue: boolean) => {
    return isOverdue ? "bg-red-50 dark:bg-red-950/20" : "";
  };

  return (
    <div className="space-y-6">
      {/* Escalations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Escalations
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{blockers.length}</span> total escalations
            {blockers.filter(b => b.is_critical).length > 0 && (
              <span className="ml-2">
                • <span className="font-medium text-red-600">{blockers.filter(b => b.is_critical).length}</span> critical
              </span>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/implementation/blockers">
              View All <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading escalations...</p>
            </div>
          ) : blockers.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2 text-green-700">No Active Escalations</h3>
              <p className="text-muted-foreground">
                No escalations requiring attention!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {blockers.length} escalation{blockers.length !== 1 ? 's' : ''}
                </p>
                {blockers.some(blocker => blocker.is_overdue) && (
                  <Badge variant="destructive" className="text-xs">
                    {blockers.filter(blocker => blocker.is_overdue).length} Overdue
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Est. Complete</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Reason Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockers.map((blocker) => (
                      <TableRow
                        key={`blocker-${blocker.id}`}
                        className={`${getRowClassName(blocker.is_overdue)} cursor-pointer hover:bg-muted/50 transition-colors`}
                        onClick={() => handleEditBlocker(blocker)}
                      >
                        <TableCell className="font-medium">
                          {blocker.customer_name}
                        </TableCell>
                        <TableCell>
                          <Link 
                            to={`/app/projects/${blocker.project_id}?tab=blockers`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {blocker.project_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium line-clamp-1">{blocker.title}</p>
                        </TableCell>
                        <TableCell>
                          {blocker.estimated_complete_date
                            ? formatDateUK(blocker.estimated_complete_date)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span className={blocker.is_overdue ? "text-red-600 font-medium" : ""}>
                            {blocker.age_days}d
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {blocker.reason_code || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Gaps Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Product Gaps
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/product-gaps">
              View All <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading product gaps...</p>
            </div>
          ) : productGaps.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2 text-green-700">No Product Gaps</h3>
              <p className="text-muted-foreground">
                No product gaps requiring attention!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {productGaps.length} product gap{productGaps.length !== 1 ? 's' : ''}
                </p>
                {productGaps.some(gap => gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date()) && (
                  <Badge variant="destructive" className="text-xs">
                    {productGaps.filter(gap => gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date()).length} Overdue
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Est. Complete</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productGaps.map((gap) => {
                      const isOverdue = gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date();
                      return (
                        <TableRow
                          key={`product-gap-${gap.id}`}
                          className={`${getRowClassName(!!isOverdue)} cursor-pointer hover:bg-muted/50 transition-colors`}
                          onClick={() => {
                            setSelectedProductGap(gap);
                            setProductGapDrawerOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            {gap.company_name}
                          </TableCell>
                          <TableCell>
                            <Link 
                              to={`/app/projects/${gap.project_id}?tab=product-gaps`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {gap.project_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium line-clamp-1">{gap.title}</p>
                          </TableCell>
                          <TableCell>
                            {gap.estimated_complete_date
                              ? formatDateUK(gap.estimated_complete_date)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                              {gap.age_days}d
                            </span>
                          </TableCell>
                          <TableCell>{getProductGapStatusBadge(gap)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Critical & Overdue Actions
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{actions.length}</span> actions requiring attention
              {actions.filter(a => a.is_critical).length > 0 && (
                <span className="ml-2">
                  • <span className="font-medium text-orange-600">{actions.filter(a => a.is_critical).length}</span> critical
                </span>
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/actions">
              View All <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading actions...</p>
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2 text-green-700">No Critical Actions</h3>
              <p className="text-muted-foreground">
                No critical or overdue actions requiring attention!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {actions.length} action{actions.length !== 1 ? 's' : ''}
                </p>
                {actions.some(action => action.is_overdue) && (
                  <Badge variant="destructive" className="text-xs">
                    {actions.filter(action => action.is_overdue).length} Overdue
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Planned Date</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow
                        key={`action-${action.id}`}
                        className={`${getRowClassName(action.is_overdue)} cursor-pointer hover:bg-muted/50 transition-colors`}
                        onClick={() => {
                          setSelectedAction(action);
                          setActionDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          {action.company_name}
                        </TableCell>
                        <TableCell>
                          <Link 
                            to={`/app/projects/${action.project_id}?tab=tasks`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {action.project_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium line-clamp-1">{action.title}</p>
                        </TableCell>
                        <TableCell>
                          {action.planned_date
                            ? formatDateUK(action.planned_date)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {action.age_days ? (
                            <span className={action.is_overdue ? "text-red-600 font-medium" : ""}>
                              {action.age_days}d
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{getActionStatusBadge(action)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-purple-500" />
              Critical & Overdue Tasks
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{tasks.length}</span> tasks requiring attention
              {tasks.filter(t => t.is_critical).length > 0 && (
                <span className="ml-2">
                  • <span className="font-medium text-purple-600">{tasks.filter(t => t.is_critical).length}</span> blocked
                </span>
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/tasks">
              View All <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2 text-green-700">No Critical Tasks</h3>
              <p className="text-muted-foreground">
                No blocked or overdue tasks requiring attention!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </p>
                {tasks.some(task => task.is_overdue) && (
                  <Badge variant="destructive" className="text-xs">
                    {tasks.filter(task => task.is_overdue).length} Overdue
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Planned End</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow
                        key={`task-${task.id}`}
                        className={`${getRowClassName(task.is_overdue)} cursor-pointer hover:bg-muted/50 transition-colors`}
                        onClick={() => {
                          setSelectedTask(task);
                          setSubtasksDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          {task.company_name}
                        </TableCell>
                        <TableCell>
                          <Link 
                            to={`/app/projects/${task.project_id}?tab=tasks`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {task.project_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium line-clamp-1">{task.task_title}</p>
                        </TableCell>
                        <TableCell>
                          {task.planned_end
                            ? formatDateUK(task.planned_end)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {task.age_days ? (
                            <span className={task.is_overdue ? "text-red-600 font-medium" : ""}>
                              {task.age_days}d
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{getTaskStatusBadge(task)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Blocker Edit Drawer */}
      {selectedBlocker && (
        <BlockerDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          projectId={selectedBlocker.project_id}
          blocker={{
            ...selectedBlocker,
            status: selectedBlocker.status as 'Live' | 'Closed',
            created_by: selectedBlocker.created_by || '',
            updated_at: selectedBlocker.updated_at || new Date().toISOString()
          }}
          onSuccess={() => {
            setDrawerOpen(false);
            setSelectedBlocker(undefined);
            loadDashboardData();
          }}
        />
      )}

      {/* Product Gap Drawer */}
      {selectedProductGap && (
        <ProductGapDrawer
          open={productGapDrawerOpen}
          onOpenChange={setProductGapDrawerOpen}
          productGap={{
            ...selectedProductGap,
            description: '',
            created_at: new Date().toISOString(),
            created_by: '',
            updated_at: new Date().toISOString(),
            status: 'Live' as const
          }}
          projectId={selectedProductGap.project_id}
        />
      )}

      {/* Action Dialog */}
      {selectedAction && (
        <EditActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          action={{
            ...selectedAction,
            details: null,
            notes: null,
            planned_date: selectedAction.planned_date || null,
            assignee: selectedAction.assignee || null,
            created_at: new Date().toISOString()
          }}
          profiles={profiles}
          onSave={async (actionData) => {
            // Update action via API
            const { error } = await supabase
              .from('actions')
              .update(actionData)
              .eq('id', selectedAction.id);
              
            if (!error) {
              loadDashboardData(); // Refresh data
            }
          }}
        />
      )}

      {/* Task Subtasks Dialog */}
      {selectedTask && (
        <SubtasksDialog
          open={subtasksDialogOpen}
          onOpenChange={setSubtasksDialogOpen}
          taskId={selectedTask.id}
          taskTitle={selectedTask.task_title}
          projectId={selectedTask.project_id}
        />
      )}
    </div>
  );
}