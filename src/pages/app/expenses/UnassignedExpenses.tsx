import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Building2, Calendar, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AssignExpenseDialog } from '@/components/AssignExpenseDialog';

interface Expense {
  id: string;
  account_code: string;
  account: string;
  expense_date: string;
  source: string;
  description: string;
  invoice_number: string;
  reference: string;
  gross: number;
  vat: number;
  net: number;
  vat_rate: number;
  vat_rate_name: string;
  customer: string;
  created_at: string;
}

export const UnassignedExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isMultiAssignMode, setIsMultiAssignMode] = useState(false);
  const [currentExpenseIndex, setCurrentExpenseIndex] = useState(0);
  const { toast } = useToast();

  const fetchUnassignedExpenses = async () => {
    try {
      setLoading(true);
      
      // Get expenses that don't have assignments
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      // Get assigned expense IDs
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('expense_assignments')
        .select('expense_id');

      if (assignmentsError) throw assignmentsError;

      const assignedIds = new Set(assignmentsData.map(a => a.expense_id));
      const unassigned = expensesData.filter(expense => !assignedIds.has(expense.id));

      setExpenses(unassigned);
    } catch (error) {
      console.error('Error fetching unassigned expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load unassigned expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnassignedExpenses();
  }, []);

  const handleAssignSuccess = () => {
    if (isMultiAssignMode) {
      // Move to next expense in multi-assign mode
      const nextIndex = currentExpenseIndex + 1;
      if (nextIndex < expenses.length) {
        setCurrentExpenseIndex(nextIndex);
        setSelectedExpense(expenses[nextIndex]);
        toast({
          title: 'Success',
          description: `Expense assigned successfully. Moving to expense ${nextIndex + 1} of ${expenses.length}`,
        });
      } else {
        // All expenses assigned, exit multi-assign mode
        setIsMultiAssignMode(false);
        setSelectedExpense(null);
        setCurrentExpenseIndex(0);
        toast({
          title: 'Complete',
          description: 'All expenses have been assigned!',
        });
      }
      fetchUnassignedExpenses();
    } else {
      fetchUnassignedExpenses();
      setSelectedExpense(null);
      toast({
        title: 'Success',
        description: 'Expense assigned successfully',
      });
    }
  };

  const startMultiAssign = () => {
    if (expenses.length === 0) return;
    setIsMultiAssignMode(true);
    setCurrentExpenseIndex(0);
    setSelectedExpense(expenses[0]);
  };

  const exitMultiAssign = () => {
    setIsMultiAssignMode(false);
    setSelectedExpense(null);
    setCurrentExpenseIndex(0);
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Unassigned Expenses</span>
            <div className="flex items-center gap-2">
              {expenses.length > 0 && !isMultiAssignMode && (
                <Button
                  onClick={startMultiAssign}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Multi Assign
                </Button>
              )}
              {isMultiAssignMode && (
                <Button
                  onClick={exitMultiAssign}
                  variant="outline"
                  size="sm"
                >
                  Exit Multi Assign
                </Button>
              )}
              <Badge variant="secondary">
                {expenses.length} unassigned
              </Badge>
            </div>
          </CardTitle>
          {isMultiAssignMode && expenses.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Multi-assign mode: Expense {currentExpenseIndex + 1} of {expenses.length}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No unassigned expenses found</p>
              <p className="text-sm">Upload an Excel file to add expenses</p>
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
                    <TableHead>Gross</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Invoice #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedExpense(expense)}
                          className="flex items-center gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Assign
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(expense.expense_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.account}</p>
                          <p className="text-sm text-muted-foreground">{expense.account_code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate" title={expense.description}>
                          {expense.description}
                        </p>
                      </TableCell>
                      <TableCell>{expense.customer}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(expense.gross)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(expense.vat)}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(expense.net)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {expense.invoice_number}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExpense && (
        <AssignExpenseDialog
          expense={selectedExpense}
          isOpen={!!selectedExpense}
          onClose={isMultiAssignMode ? exitMultiAssign : () => setSelectedExpense(null)}
          onSuccess={handleAssignSuccess}
          isMultiAssignMode={isMultiAssignMode}
          currentIndex={currentExpenseIndex}
          totalCount={expenses.length}
        />
      )}
    </>
  );
};