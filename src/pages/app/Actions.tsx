import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Filter, FilterX, User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Action {
  id: string;
  title: string;
  details: string | null;
  status: string;
  planned_date: string | null;
  is_critical: boolean;
  assignee: string | null;
  created_at: string;
  profiles?: {
    name: string;
  };
  project_tasks?: {
    task_title: string;
    step_name: string;
    projects: {
      name: string;
      companies: {
        name: string;
      };
    };
  };
  projects?: {
    name: string;
    companies: {
      name: string;
    };
  };
}

export const Actions = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [actions, setActions] = useState<Action[]>([]);
  const [filteredActions, setFilteredActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMyActions, setShowMyActions] = useState(false);
  const [highlightedActionId, setHighlightedActionId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Action | 'project_name' | 'company_name' | 'assignee_name' | 'task_name' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    project: 'all',
    company: 'all',
    task: 'all',
    title: '',
    status: 'all',
    assignee: 'all',
    critical: 'all',
  });

  useEffect(() => {
    if (user && profile) {
      fetchActions();
    }
  }, [user, profile]);

  useEffect(() => {
    // Apply filtering and sorting
    setFilteredActions(sortedAndFilteredActions());
  }, [actions, showMyActions, user, sortConfig, filters]);

  // Handle URL parameter to highlight specific action
  useEffect(() => {
    const highlightActionId = searchParams.get('highlightAction');
    if (highlightActionId) {
      setHighlightedActionId(highlightActionId);
      // Remove the parameter from URL after highlighting
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('highlightAction');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          profiles:assignee(name),
          project_tasks(
            task_title,
            step_name,
            projects!inner(
              name,
              companies!inner(name)
            )
          ),
          projects(
            name,
            companies!inner(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching actions:', error);
        return;
      }

      setActions(data || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'open':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSort = (key: keyof Action | 'project_name' | 'company_name' | 'assignee_name' | 'task_name') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Action | 'project_name' | 'company_name' | 'assignee_name' | 'task_name') => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const sortedAndFilteredActions = () => {
    let filtered = showMyActions 
      ? actions.filter(action => action.assignee === user?.id)
      : actions;

    // Apply filters
    filtered = filtered.filter(action => {
      const projectName = action.project_tasks?.projects?.name || action.projects?.name || '';
      const companyName = action.project_tasks?.projects?.companies?.name || action.projects?.companies?.name || '';
      const taskName = action.project_tasks?.task_title || '';
      const assigneeName = action.profiles?.name || '';
      
      return (
        (filters.project === 'all' || projectName.toLowerCase().includes(filters.project.toLowerCase())) &&
        (filters.company === 'all' || companyName.toLowerCase().includes(filters.company.toLowerCase())) &&
        (filters.task === 'all' || taskName.toLowerCase().includes(filters.task.toLowerCase())) &&
        action.title.toLowerCase().includes(filters.title.toLowerCase()) &&
        (filters.status === 'all' || action.status.toLowerCase().includes(filters.status.toLowerCase())) &&
        (filters.assignee === 'all' || assigneeName.toLowerCase().includes(filters.assignee.toLowerCase())) &&
        (filters.critical === 'all' || 
         (filters.critical === 'critical' && action.is_critical) ||
         (filters.critical === 'normal' && !action.is_critical))
      );
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'project_name':
            aValue = a.project_tasks?.projects?.name || a.projects?.name || '';
            bValue = b.project_tasks?.projects?.name || b.projects?.name || '';
            break;
          case 'company_name':
            aValue = a.project_tasks?.projects?.companies?.name || a.projects?.companies?.name || '';
            bValue = b.project_tasks?.projects?.companies?.name || b.projects?.companies?.name || '';
            break;
          case 'task_name':
            aValue = a.project_tasks?.task_title || '';
            bValue = b.project_tasks?.task_title || '';
            break;
          case 'assignee_name':
            aValue = a.profiles?.name || '';
            bValue = b.profiles?.name || '';
            break;
          case 'planned_date':
            aValue = a.planned_date ? new Date(a.planned_date) : new Date(0);
            bValue = b.planned_date ? new Date(b.planned_date) : new Date(0);
            break;
          default:
            aValue = a[sortConfig.key as keyof Action] || '';
            bValue = b[sortConfig.key as keyof Action] || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  // Get unique values for filter dropdowns
  const uniqueProjects = [...new Set(actions.map(action => action.project_tasks?.projects?.name || action.projects?.name).filter(name => name && name.trim() !== ''))];
  const uniqueCompanies = [...new Set(actions.map(action => action.project_tasks?.projects?.companies?.name || action.projects?.companies?.name).filter(name => name && name.trim() !== ''))];
  const uniqueTasks = [...new Set(actions.map(action => action.project_tasks?.task_title).filter(task => task && task.trim() !== ''))];
  const uniqueStatuses = [...new Set(actions.map(action => action.status).filter(status => status && status.trim() !== ''))];
  const uniqueAssignees = [...new Set(actions.map(action => action.profiles?.name).filter(name => name && name.trim() !== ''))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading actions...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Global Actions</CardTitle>
            <Button
              variant={showMyActions ? "default" : "outline"}
              onClick={() => setShowMyActions(!showMyActions)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              {showMyActions ? "Show All Actions" : "Show My Actions"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!loading && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Project</label>
                  <Select value={filters.project} onValueChange={(value) => setFilters(prev => ({ ...prev, project: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {uniqueProjects.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Company</label>
                  <Select value={filters.company} onValueChange={(value) => setFilters(prev => ({ ...prev, company: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {uniqueCompanies.map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Task</label>
                  <Select value={filters.task} onValueChange={(value) => setFilters(prev => ({ ...prev, task: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks</SelectItem>
                      {uniqueTasks.map(task => (
                        <SelectItem key={task} value={task}>{task}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Action Title</label>
                  <Input
                    placeholder="Filter actions..."
                    value={filters.title}
                    onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Assignee</label>
                  <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      {uniqueAssignees.map(assignee => (
                        <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={filters.critical} onValueChange={(value) => setFilters(prev => ({ ...prev, critical: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(Object.values(filters).some(f => f !== '' && f !== 'all') || sortConfig.key) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ project: 'all', company: 'all', task: 'all', title: '', status: 'all', assignee: 'all', critical: 'all' });
                    setSortConfig({ key: null, direction: 'asc' });
                  }}
                >
                  Clear Filters & Sort
                </Button>
              )}
            </div>
          )}
          <p className="text-muted-foreground mb-4">
            {showMyActions 
              ? `Showing ${filteredActions.length} actions assigned to you`
              : `Showing ${filteredActions.length} total actions`
            }
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading actions...</div>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Filter className="h-12 w-12 text-muted-foreground" />
              <div className="text-lg font-medium">No actions found</div>
              <div className="text-muted-foreground text-center">
                {showMyActions 
                  ? "You don't have any actions assigned to you."
                  : "No actions available for your accessible projects."
                }
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('title')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Action {getSortIcon('title')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('project_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Project {getSortIcon('project_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('task_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Task {getSortIcon('task_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('assignee_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Assignee {getSortIcon('assignee_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('status')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Status {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('planned_date')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Planned Date {getSortIcon('planned_date')}
                      </Button>
                    </TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {showMyActions ? "No actions assigned to you" : "No actions found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map((action) => (
                    <TableRow 
                      key={action.id}
                      className={highlightedActionId === action.id ? 'bg-primary/5 border-primary' : ''}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{action.title}</div>
                          {action.details && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {action.details.length > 100 
                                ? `${action.details.substring(0, 100)}...` 
                                : action.details
                              }
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {action.project_tasks?.projects?.name || action.projects?.name || 'Unknown Project'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {action.project_tasks?.projects?.companies?.name || action.projects?.companies?.name || 'Unknown Company'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {action.project_tasks ? (
                          <div>
                            <div className="font-medium">{action.project_tasks.step_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {action.project_tasks.task_title}
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">Project-level action</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.profiles?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(action.status)}>
                          {formatStatus(action.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {action.planned_date 
                          ? format(new Date(action.planned_date), 'MMM dd, yyyy')
                          : 'Not set'
                        }
                      </TableCell>
                      <TableCell>
                        {action.is_critical && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Actions;