import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { getBauExpenses } from '@/lib/bauService';
import { useExpenseAccess } from '@/hooks/useExpenseAccess';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Shield } from 'lucide-react';

interface BAUExpensesTabProps {
  customerId: string;
}

export const BAUExpensesTab = ({ customerId }: BAUExpensesTabProps) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasAccess: hasExpenseAccess, loading: accessLoading } = useExpenseAccess();
  const { toast } = useToast();

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await getBauExpenses(customerId);
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [customerId]);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (accessLoading || loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasExpenseAccess) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              You don't have permission to view expense data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Linked Expenses ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {expense.expense_assignments?.expenses?.expense_date 
                        ? format(new Date(expense.expense_assignments.expenses.expense_date), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {expense.expense_assignments?.expenses?.description || '-'}
                        </div>
                        {expense.expense_assignments?.assignee_description && (
                          <div className="text-sm text-muted-foreground">
                            {expense.expense_assignments.assignee_description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(expense.expense_assignments?.expenses?.gross)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.expense_assignments?.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={expense.is_billable ? "default" : "secondary"}>
                        {expense.is_billable ? 'Billable' : 'Non-billable'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {expenses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No expenses linked to this BAU customer.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};