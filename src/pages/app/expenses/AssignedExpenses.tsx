import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX, Calendar, User, Building, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssignedExpense {
  id: string;
  expense_id: string;
  assigned_to_user_id: string | null;
  assigned_to_project_id: string | null;
  assigned_to_solutions_project_id: string | null;
  is_billable: boolean;
  assignment_notes: string | null;
  assigned_at: string;
  expenses: {
    id: string;
    account_code: string;
    account: string;
    expense_date: string;
    description: string;
    customer: string;
    gross: number;
    vat: number;
    net: number;
    invoice_number: string;
  };
  assigned_user?: {
    user_id: string;
    name: string;
    avatar_url: string | null;
  };
  assigned_project?: {
    id: string;
    name: string;
  };
  assigned_solutions_project?: {
    id: string;
    name: string;
  };
}

export const AssignedExpenses = () => {
  const [assignedExpenses, setAssignedExpenses] = useState<AssignedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignedExpenses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('expense_assignments')
        .select(`
          *,
          expenses:expense_id (
            id,
            account_code,
            account,
            expense_date,
            description,
            customer,
            gross,
            vat,
            net,
            invoice_number
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch user and project details for each assignment
      const enrichedData: AssignedExpense[] = await Promise.all(
        data.map(async (assignment): Promise<AssignedExpense> => {
          const enriched: AssignedExpense = {
            ...assignment,
            expenses: assignment.expenses as any, // We'll handle this properly
            assigned_user: undefined,
            assigned_project: undefined,
            assigned_solutions_project: undefined
          };

          // Fetch user details if assigned to user
          if (assignment.assigned_to_user_id) {
            const { data: userData } = await supabase
              .rpc('get_safe_profile_info', { target_user_id: assignment.assigned_to_user_id });
            
            if (userData && userData.length > 0) {
              enriched.assigned_user = userData[0];
            }
          }

          // Fetch project details if assigned to implementation project
          if (assignment.assigned_to_project_id) {
            const { data: projectData } = await supabase
              .from('projects')
              .select('id, name')
              .eq('id', assignment.assigned_to_project_id)
              .single();
            
            if (projectData) {
              enriched.assigned_project = projectData;
            }
          }

          // Fetch solutions project details if assigned to solutions project
          if (assignment.assigned_to_solutions_project_id) {
            const { data: solutionsData } = await supabase
              .from('solutions_projects')
              .select('id, site_name')
              .eq('id', assignment.assigned_to_solutions_project_id)
              .single();
            
            if (solutionsData) {
              enriched.assigned_solutions_project = {
                id: solutionsData.id,
                name: solutionsData.site_name
              };
            }
          }

          return enriched;
        })
      );

      setAssignedExpenses(enrichedData);
    } catch (error) {
      console.error('Error fetching assigned expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assigned expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedExpenses();
  }, []);

  const handleUnassign = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('expense_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Expense unassigned successfully',
      });
      
      fetchAssignedExpenses();
    } catch (error) {
      console.error('Error unassigning expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to unassign expense',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Assigned Expenses</span>
          <Badge variant="secondary">
            {assignedExpenses.length} assigned
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignedExpenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No assigned expenses found</p>
            <p className="text-sm">Assign expenses from the unassigned tab</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actions</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Billable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedExpenses.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassign(assignment.id)}
                        className="flex items-center gap-2"
                      >
                        <UserX className="h-4 w-4" />
                        Unassign
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(assignment.expenses.expense_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assignment.expenses.account}</p>
                        <p className="text-sm text-muted-foreground">{assignment.expenses.account_code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate" title={assignment.expenses.description}>
                        {assignment.expenses.description}
                      </p>
                    </TableCell>
                    <TableCell>{assignment.expenses.customer}</TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(assignment.expenses.net)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {assignment.assigned_user && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={assignment.assigned_user.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(assignment.assigned_user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="text-sm">{assignment.assigned_user.name}</span>
                            </div>
                          </div>
                        )}
                        {assignment.assigned_project && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="text-sm">Impl: {assignment.assigned_project.name}</span>
                          </div>
                        )}
                        {assignment.assigned_solutions_project && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="text-sm">Sol: {assignment.assigned_solutions_project.name}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.is_billable ? 'default' : 'secondary'}>
                        {assignment.is_billable ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Billable</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />Non-billable</>
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};