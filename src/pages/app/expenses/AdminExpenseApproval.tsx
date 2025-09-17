import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Shield, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listReadyForSignoff, listApproved, adminApproveExpense, getCustomers, getAllProjectsForSelection, type Customer, type Project } from '@/lib/expenseService';
import { getBauCustomers, type BAUCustomer } from '@/lib/bauService';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ExpenseDetailSidebar } from './ExpenseDetailSidebar';

export const AdminExpenseApproval = () => {
  const { toast } = useToast();
  const [readyForSignoff, setReadyForSignoff] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [bulkApproving, setBulkApproving] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bauCustomers, setBauCustomers] = useState<BAUCustomer[]>([]);

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
      const [signoffResult, approvedResult, customersResult, projectsResult, bauResult] = await Promise.all([
        listReadyForSignoff(),
        listApproved(),
        getCustomers(),
        getAllProjectsForSelection(),
        getBauCustomers(1, 100)
      ]);
      setReadyForSignoff(signoffResult);
      setApproved(approvedResult);
      setCustomers(customersResult);
      setProjects(projectsResult);
      setBauCustomers(bauResult.data);
    } catch (error) {
      console.error('Error fetching admin expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expense data',
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
    try {
      setApproving(prev => ({ ...prev, [expenseId]: true }));
      await adminApproveExpense(expenseId);
      
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

  const handleBulkApprove = async () => {
    if (readyForSignoff.length === 0) return;
    
    setBulkApproving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Process each expense
      for (const expense of readyForSignoff) {
        try {
          await adminApproveExpense(expense.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to approve expense ${expense.id}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Bulk Approve Complete",
        description: `${successCount} expenses approved, ${errorCount} failed`,
        variant: errorCount > 0 ? "destructive" : "default"
      });

      fetchData();
    } catch (error) {
      console.error('Error during bulk approval:', error);
      toast({
        title: "Error",
        description: "Failed to bulk approve expenses",
        variant: "destructive"
      });
    } finally {
      setBulkApproving(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <ExpenseDetailSidebar 
          expense={selectedExpense}
          customers={customers}
          projects={projects}
          bauCustomers={bauCustomers}
          onExpenseUpdate={fetchData}
        />
        <div className="flex-1">
          <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin - Expense Approval
            </CardTitle>
            <SidebarTrigger />
          </CardHeader>
      <CardContent>
        <Tabs defaultValue="signoff" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signoff">Ready for Sign-off ({readyForSignoff.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signoff" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Expenses Ready for Approval</h3>
              {readyForSignoff.length > 0 && (
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkApproving}
                  size="sm"
                >
                  {bulkApproving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All ({readyForSignoff.length})
                </Button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : readyForSignoff.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No expenses ready for sign-off</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyForSignoff.map((expense: any) => (
                     <TableRow 
                       key={expense.id}
                       className={`cursor-pointer transition-colors ${selectedExpense?.id === expense.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                       onClick={() => setSelectedExpense(expense)}
                     >
                       <TableCell>{formatDate(expense.expense_date)}</TableCell>
                       <TableCell className="max-w-48">
                         <div className="truncate" title={expense.expense_description || ''}>
                           {expense.expense_description || 'N/A'}
                         </div>
                       </TableCell>
                       <TableCell>{expense.customer || expense.import_customer || 'N/A'}</TableCell>
                       <TableCell className="font-medium">{formatCurrency(expense.net)}</TableCell>
                       <TableCell>{expense.assignee_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {expense.category && <Badge variant="secondary">{expense.category}</Badge>}
                      </TableCell>
                      <TableCell>
                        {expense.is_billable ? (
                          <Badge variant="default">Billable</Badge>
                        ) : (
                          <Badge variant="outline">Non-billable</Badge>
                        )}
                      </TableCell>
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
            )}
          </TabsContent>
          
          <TabsContent value="approved" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Approved Expenses</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : approved.length === 0 ? (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">No approved expenses</p>
                  </div>
                ) : (
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
                        <TableHead>Approved By</TableHead>
                        <TableHead>Approved Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approved.map((expense: any) => (
                        <TableRow 
                          key={expense.id}
                          className={`cursor-pointer transition-colors ${selectedExpense?.id === expense.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <TableCell>{formatDate(expense.expense_date)}</TableCell>
                          <TableCell className="max-w-48">
                            <div className="truncate" title={expense.expense_description || ''}>
                              {expense.expense_description || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>{expense.customer || expense.import_customer || 'N/A'}</TableCell>
                          <TableCell>{expense.project_name || 'N/A'}</TableCell>
                          <TableCell>
                            {expense.is_billable ? (
                              <Badge variant="default">Billable</Badge>
                            ) : (
                              <Badge variant="outline">Non-billable</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {expense.category && <Badge variant="secondary">{expense.category}</Badge>}
                          </TableCell>
                          <TableCell>{formatCurrency(expense.gross)}</TableCell>
                          <TableCell>{expense.assignee_name || 'Unknown'}</TableCell>
                          <TableCell>{expense.approved_by_name || '-'}</TableCell>
                          <TableCell>
                            {expense.approved_at ? formatDate(expense.approved_at) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
        </div>
      </div>
    </SidebarProvider>
  );
};