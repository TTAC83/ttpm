import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  listPendingLeadReview, 
  leadApproveExpense 
} from '@/lib/expenseService';

interface PendingExpense {
  id: string;
  expense_id: string;
  expense_date: string;
  expense_description: string;
  assignee_name: string;
  import_customer: string;
  net: number;
  vat: number;
  gross: number;
  is_billable: boolean;
  category: string;
  status: string;
  customer: string;
  assignee_description: string;
  assignment_notes: string;
  assigned_at: string;
  source: string;
  account: string;
  account_code: string;
  vat_rate: number;
}

export const ProjectCosts = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [billableSettings, setBillableSettings] = useState<Record<string, boolean>>({});

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
      const result = await listPendingLeadReview();
      setExpenses(result);
      
      // Initialize billable settings
      const settings: Record<string, boolean> = {};
      result.forEach((expense: PendingExpense) => {
        settings[expense.id] = expense.is_billable;
      });
      setBillableSettings(settings);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending expenses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (expenseId: string) => {
    const billable = billableSettings[expenseId] || false;
    
    try {
      setApproving(prev => ({ ...prev, [expenseId]: true }));
      await leadApproveExpense(expenseId, billable);
      
      toast({
        title: 'Success',
        description: 'Expense approved successfully'
      });
      
      fetchData();
    } catch (error) {
      console.error('Error approving expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve expense',
        variant: 'destructive'
      });
    } finally {
      setApproving(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const handleBillableChange = (expenseId: string, billable: boolean) => {
    setBillableSettings(prev => ({ ...prev, [expenseId]: billable }));
  };

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

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
            <p className="text-muted-foreground">
              There are no expenses pending your review at the moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Project Costs - Pending Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project/Site</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
             <TableBody>
               {expenses.map(expense => (
                 <TableRow key={expense.id}>
                   <TableCell>{formatDate(expense.expense_date)}</TableCell>
                   <TableCell className="max-w-48">
                     <div className="truncate" title={expense.expense_description || ''}>
                       {expense.expense_description || 'N/A'}
                     </div>
                   </TableCell>
                   <TableCell>{expense.import_customer || 'N/A'}</TableCell>
                   <TableCell>
                     <div className="font-medium">{expense.customer || 'No Project'}</div>
                   </TableCell>
                   <TableCell>
                     <Switch
                       checked={billableSettings[expense.id] ?? expense.is_billable}
                       onCheckedChange={(checked) => 
                         setBillableSettings(prev => ({ ...prev, [expense.id]: checked }))
                       }
                     />
                   </TableCell>
                   <TableCell>
                     {expense.category && (
                       <Badge variant="secondary">{expense.category}</Badge>
                     )}
                   </TableCell>
                   <TableCell className="font-medium">
                     <div>
                       <div>{formatCurrency(expense.net)}</div>
                       <div className="text-sm text-muted-foreground">
                         Gross: {formatCurrency(expense.gross)}
                       </div>
                     </div>
                   </TableCell>
                   <TableCell>{expense.assignee_name || 'Unknown'}</TableCell>
                   <TableCell>
                     <Button
                       size="sm"
                       onClick={() => handleApprove(expense.id)}
                       disabled={approving[expense.id]}
                     >
                       {approving[expense.id] && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                       <CheckCircle className="h-4 w-4 mr-1" />
                       Approve
                     </Button>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};