import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Filter, FilterX } from "lucide-react";

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
  project_tasks: {
    task_title: string;
    step_name: string;
    projects: {
      name: string;
      companies: {
        name: string;
      };
    };
  };
}

export const Actions = () => {
  const { user, profile } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [filteredActions, setFilteredActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMyActions, setShowMyActions] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchActions();
    }
  }, [user, profile]);

  useEffect(() => {
    if (showMyActions && user) {
      setFilteredActions(actions.filter(action => action.assignee === user.id));
    } else {
      setFilteredActions(actions);
    }
  }, [actions, showMyActions, user]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          profiles:assignee(name),
          project_tasks!inner(
            task_title,
            step_name,
            projects!inner(
              name,
              companies!inner(name)
            )
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
            <CardTitle className="text-2xl font-bold">Actions</CardTitle>
            <Button
              variant={showMyActions ? "default" : "outline"}
              onClick={() => setShowMyActions(!showMyActions)}
              className="flex items-center gap-2"
            >
              {showMyActions ? <FilterX className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              {showMyActions ? "Show All Actions" : "Show My Actions"}
            </Button>
          </div>
          <p className="text-muted-foreground">
            {showMyActions 
              ? `Showing ${filteredActions.length} actions assigned to you`
              : `Showing ${filteredActions.length} total actions`
            }
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planned Date</TableHead>
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
                    <TableRow key={action.id}>
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
                          <div className="font-medium">{action.project_tasks.projects.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {action.project_tasks.projects.companies.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{action.project_tasks.step_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {action.project_tasks.task_title}
                          </div>
                        </div>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Actions;