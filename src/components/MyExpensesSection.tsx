import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { listMyAssignedExpenses } from '@/lib/expenseService';
import { ExpenseReviewDialog } from '@/components/ExpenseReviewDialog';
import { useToast } from '@/hooks/use-toast';
import { useExpenseAccess } from '@/hooks/useExpenseAccess';

interface MyExpense {
  id: string;
  expense_id: string;
  expense_date: string;
  expense_description: string;
  import_customer: string;
  net: number;
  vat: number;
  gross: number;
  account: string;
  account_code: string;
  source: string;
  status: string;
  customer: string;
  is_billable: boolean;
  category: string;
  assignee_description: string;
}

export const MyExpensesSection = () => {
  const [expenses, setExpenses] = useState<MyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<MyExpense | null>(null);
  const { toast } = useToast();
  const { hasAccess, loading: accessLoading } = useExpenseAccess();

  useEffect(() => {
    if (hasAccess) {
      fetchExpenses();
    } else if (!accessLoading) {
      setLoading(false);
    }
  }, [hasAccess, accessLoading]);

  const fetchExpenses = async () => {
    try {
      const data = await listMyAssignedExpenses();
      // Show only the most recent 5 expenses
      setExpenses(data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching my expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load your expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Assigned': { variant: 'secondary' as const, label: 'Needs Review' },
      'ConfirmedByAssignee': { variant: 'default' as const, label: 'Submitted' },
      'PendingLeadReview': { variant: 'default' as const, label: 'Lead Review' },
      'ReadyForSignoff': { variant: 'default' as const, label: 'Admin Review' },
      'Approved': { variant: 'default' as const, label: 'Approved' },
      'Rejected': { variant: 'destructive' as const, label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!hasAccess && !accessLoading) {
    return null; // Don't show section if user doesn't have access
  }

  if (loading || accessLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            My Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            My Expenses
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/app/expenses'}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No expenses assigned</h3>
              <p className="text-muted-foreground">
                You don't have any expenses assigned to you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{expense.expense_description}</h4>
                          {getStatusBadge(expense.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatDate(expense.expense_date)}</span>
                          <span>{expense.import_customer}</span>
                          <span className="font-medium">{formatCurrency(expense.gross)}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant={expense.status === 'Assigned' ? 'default' : 'outline'}
                        onClick={() => setSelectedExpense(expense)}
                      >
                        {expense.status === 'Assigned' ? 'Review' : 'View'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExpense && (
        <ExpenseReviewDialog
          expense={selectedExpense}
          open={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onSuccess={() => {
            setSelectedExpense(null);
            fetchExpenses();
          }}
        />
      )}
    </>
  );
};