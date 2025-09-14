import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  listUnassignedExpenses, 
  assignExpensesToUser, 
  getInternalUsers, 
  getAssigneeSuggestions,
  type UnassignedExpense,
  type InternalUser,
  type AssigneeSuggestion 
} from '@/lib/expenseService';

export const UnassignedExpensesBatch = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<UnassignedExpense[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, AssigneeSuggestion[]>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount) return '£0.00';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesResult, usersResult] = await Promise.all([
        listUnassignedExpenses(currentPage, pageSize),
        getInternalUsers()
      ]);
      
      setExpenses(expensesResult.data);
      setTotalCount(expensesResult.count);
      setUsers(usersResult);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    const newSelection = new Set(selectedExpenses);
    if (checked) {
      newSelection.add(expenseId);
    } else {
      newSelection.delete(expenseId);
    }
    setSelectedExpenses(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(new Set(expenses.map(e => e.id)));
    } else {
      setSelectedExpenses(new Set());
    }
  };

  const handleGetSuggestions = async (expenseId: string) => {
    try {
      const result = await getAssigneeSuggestions(expenseId);
      setSuggestions(prev => ({ ...prev, [expenseId]: result }));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to get assignee suggestions',
        variant: 'destructive'
      });
    }
  };

  const handleAssignSelected = async () => {
    if (selectedExpenses.size === 0 || !selectedUser) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select expenses and a user to assign them to',
        variant: 'destructive'
      });
      return;
    }

    try {
      setAssigning(true);
      await assignExpensesToUser(Array.from(selectedExpenses), selectedUser);
      
      toast({
        title: 'Success',
        description: `Assigned ${selectedExpenses.size} expenses successfully`
      });
      
      setSelectedExpenses(new Set());
      setSelectedUser('');
      fetchData();
    } catch (error) {
      console.error('Error assigning expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign expenses',
        variant: 'destructive'
      });
    } finally {
      setAssigning(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Assign Unassigned Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Assign to:</span>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAssignSelected}
              disabled={selectedExpenses.size === 0 || !selectedUser || assigning}
            >
              {assigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign Selected ({selectedExpenses.size})
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedExpenses.size === expenses.length && expenses.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Assign to User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedExpenses.has(expense.id)}
                        onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(expense.expense_date)}</TableCell>
                    <TableCell className="max-w-48">
                      <div className="truncate" title={expense.description || ''}>
                        {expense.description || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(expense.net)}
                    </TableCell>
                    <TableCell>{expense.customer || 'N/A'}</TableCell>
                    <TableCell>{expense.reference || 'N/A'}</TableCell>
                    <TableCell>{expense.invoice_number || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGetSuggestions(expense.id)}
                        >
                          <Lightbulb className="h-4 w-4 mr-1" />
                          Suggest
                        </Button>
                        {suggestions[expense.id] && (
                          <div className="flex gap-1">
                            {suggestions[expense.id].slice(0, 3).map((suggestion, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => setSelectedUser(suggestion.user_id)}
                              >
                                {suggestion.matched_text}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} expenses
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};