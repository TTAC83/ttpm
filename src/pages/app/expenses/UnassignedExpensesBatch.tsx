import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Save } from 'lucide-react';
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

interface ExpenseAssignment {
  expenseId: string;
  userId: string;
}

export const UnassignedExpensesBatch = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<UnassignedExpense[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, AssigneeSuggestion[]>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 500;

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

      // Automatically fetch suggestions for all expenses
      if (expensesResult.data.length > 0) {
        const suggestionPromises = expensesResult.data.map(expense => 
          getAssigneeSuggestions(expense.id).catch(error => {
            console.error(`Error getting suggestions for expense ${expense.id}:`, error);
            return [];
          })
        );
        
        const allSuggestions = await Promise.all(suggestionPromises);
        const suggestionsMap: Record<string, AssigneeSuggestion[]> = {};
        
        expensesResult.data.forEach((expense, index) => {
          suggestionsMap[expense.id] = allSuggestions[index];
        });
        
        setSuggestions(suggestionsMap);
      }
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

  const handleUserAssignment = (expenseId: string, userId: string) => {
    setAssignments(prev => ({
      ...prev,
      [expenseId]: userId
    }));
  };

  const handleAutoAssignSuggestions = () => {
    const newAssignments = { ...assignments };
    let assignedCount = 0;

    Object.entries(suggestions).forEach(([expenseId, expenseSuggestions]) => {
      if (expenseSuggestions.length > 0 && !assignments[expenseId]) {
        newAssignments[expenseId] = expenseSuggestions[0].user_id;
        assignedCount++;
      }
    });

    setAssignments(newAssignments);
    
    if (assignedCount > 0) {
      toast({
        title: 'Auto-assigned suggestions',
        description: `Automatically assigned ${assignedCount} expenses based on suggestions`,
      });
    } else {
      toast({
        title: 'No assignments made',
        description: 'All expenses either already have assignments or no suggestions available',
        variant: 'destructive'
      });
    }
  };


  const handleSaveAll = async () => {
    const assignmentEntries = Object.entries(assignments).filter(([_, userId]) => userId);
    
    if (assignmentEntries.length === 0) {
      toast({
        title: 'No Assignments',
        description: 'Please assign users to expenses before saving',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      // Group assignments by user to make fewer API calls
      const userGroups: Record<string, string[]> = {};
      assignmentEntries.forEach(([expenseId, userId]) => {
        if (!userGroups[userId]) {
          userGroups[userId] = [];
        }
        userGroups[userId].push(expenseId);
      });

      // Assign expenses in parallel for each user
      await Promise.all(
        Object.entries(userGroups).map(([userId, expenseIds]) =>
          assignExpensesToUser(expenseIds, userId)
        )
      );
      
      toast({
        title: 'Success',
        description: `Assigned ${assignmentEntries.length} expenses successfully`
      });
      
      setAssignments({});
      fetchData();
    } catch (error) {
      console.error('Error assigning expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign expenses',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Assign users to expenses and save all changes at once
              </div>
              <Button
                onClick={handleAutoAssignSuggestions}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Auto-assign Suggestions
              </Button>
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={Object.keys(assignments).length === 0 || saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              Save All Assignments ({Object.entries(assignments).filter(([_, userId]) => userId).length})
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assign to User</TableHead>
                  <TableHead>Auto Suggestions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id}>
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
                    <TableCell className="w-64">
                      <Select 
                        value={assignments[expense.id] || ''} 
                        onValueChange={(userId) => handleUserAssignment(expense.id, userId)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {suggestions[expense.id] && suggestions[expense.id].length > 0 ? (
                        <div className="flex gap-1">
                          {suggestions[expense.id].slice(0, 3).map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-secondary/80"
                              onClick={() => handleUserAssignment(expense.id, suggestion.user_id)}
                            >
                              {suggestion.matched_text}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No suggestions</span>
                      )}
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