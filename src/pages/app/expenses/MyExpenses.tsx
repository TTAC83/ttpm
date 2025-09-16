import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { listMyAssignedExpenses } from '@/lib/expenseService';
import { ExpenseReviewDialog } from '@/components/ExpenseReviewDialog';
import { useToast } from '@/hooks/use-toast';

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

export const MyExpenses = () => {
  const [expenses, setExpenses] = useState<MyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<MyExpense | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs-action' | 'submitted'>('needs-action');
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const data = await listMyAssignedExpenses();
      setExpenses(data);
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

  const filteredExpenses = expenses.filter(expense => {
    switch (filter) {
      case 'needs-action':
        return expense.status === 'Assigned';
      case 'submitted':
        return expense.status !== 'Assigned';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Expenses</h1>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'needs-action' ? 'default' : 'outline'}
            onClick={() => setFilter('needs-action')}
          >
            Needs Action ({expenses.filter(e => e.status === 'Assigned').length})
          </Button>
          <Button 
            variant={filter === 'submitted' ? 'default' : 'outline'}
            onClick={() => setFilter('submitted')}
          >
            Submitted ({expenses.filter(e => e.status !== 'Assigned').length})
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({expenses.length})
          </Button>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">No expenses found</h2>
              <p className="text-muted-foreground">
                {filter === 'needs-action' 
                  ? "You don't have any expenses that need your attention."
                  : filter === 'submitted'
                  ? "You haven't submitted any expenses yet."
                  : "No expenses have been assigned to you yet."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{expense.expense_description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(expense.expense_date)} • {expense.import_customer}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold">{formatCurrency(expense.gross)}</div>
                      <div className="text-sm text-muted-foreground">
                        Net: {formatCurrency(expense.net)} + VAT: {formatCurrency(expense.vat)}
                      </div>
                    </div>
                    {getStatusBadge(expense.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Account:</span>
                    <div className="font-medium">{expense.account}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Code:</span>
                    <div className="font-medium">{expense.account_code}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>
                    <div className="font-medium">{expense.source}</div>
                  </div>
                  <div className="flex justify-end">
                    {expense.status === 'Assigned' ? (
                      <Button 
                        size="sm"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        Review & Submit
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>

                {expense.customer && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <strong>Customer:</strong> {expense.customer}
                      {expense.category && <span className="ml-4"><strong>Category:</strong> {expense.category}</span>}
                      {expense.is_billable !== null && (
                        <span className="ml-4">
                          <strong>Billable:</strong> {expense.is_billable ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                    {expense.assignee_description && (
                      <div className="text-sm mt-2">
                        <strong>Description:</strong> {expense.assignee_description}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
};