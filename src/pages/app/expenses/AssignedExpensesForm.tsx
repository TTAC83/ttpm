import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, FileText, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  listAssignedToMe, 
  getCustomers, 
  getAllProjectsForSelection, 
  confirmMyExpense,
  type Customer,
  type Project 
} from '@/lib/expenseService';

const categoryOptions = [
  { value: 'FoodDrink', label: 'Food & Drink' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Tools', label: 'Tools' },
  { value: 'Software', label: 'Software' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Postage', label: 'Postage' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Other', label: 'Other' }
];

interface AssignedExpenseItem {
  id: string;
  expense_id: string;
  status: string;
  category?: string;
  customer?: string;
  assignee_description?: string;
  is_billable: boolean;
  assigned_to_project_id?: string;
  assigned_to_solutions_project_id?: string;
  expenses: {
    id: string;
    expense_date?: string;
    description?: string;
    customer?: string;
    reference?: string;
    invoice_number?: string;
    net?: number;
    gross?: number;
    vat?: number;
  };
}

export const AssignedExpensesForm = () => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignedExpenseItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string>('');

  // Form states for each assignment
  const [formData, setFormData] = useState<Record<string, {
    customer: string;
    assignToProject: boolean;
    billable: boolean;
    category: string;
    description: string;
    selectedProject: Project | null;
  }>>({});

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount) return '£0.00';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Assigned': 'outline',
      'ConfirmedByAssignee': 'default',
      'PendingLeadReview': 'secondary',
      'ReadyForSignoff': 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsResult, customersResult, projectsResult] = await Promise.all([
        listAssignedToMe(),
        getCustomers(),
        getAllProjectsForSelection()
      ]);
      
      setAssignments(assignmentsResult);
      setCustomers(customersResult);
      setProjects(projectsResult);

      // Initialize form data
      const initialFormData: typeof formData = {};
      assignmentsResult.forEach(assignment => {
        initialFormData[assignment.id] = {
          customer: assignment.customer || assignment.expenses.customer || '',
          assignToProject: !!(assignment.assigned_to_project_id || assignment.assigned_to_solutions_project_id),
          billable: assignment.is_billable,
          category: assignment.category || 'Other',
          description: assignment.assignee_description || '',
          selectedProject: null
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assigned expenses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateFormData = (assignmentId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value
      }
    }));
  };

  const handleProjectSelect = (project: Project) => {
    updateFormData(currentAssignmentId, 'selectedProject', project);
    setSelectedProject(project);
    setProjectDialogOpen(false);
  };

  const handleConfirmExpense = async (assignmentId: string) => {
    const data = formData[assignmentId];
    if (!data) return;

    try {
      await confirmMyExpense(
        assignmentId,
        data.customer,
        data.billable,
        data.category as any,
        data.description,
        data.assignToProject,
        data.selectedProject?.kind,
        data.selectedProject?.project_id || data.selectedProject?.solutions_project_id
      );

      toast({
        title: 'Success',
        description: 'Expense confirmed successfully'
      });

      fetchData();
    } catch (error) {
      console.error('Error confirming expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm expense',
        variant: 'destructive'
      });
    }
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

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Assigned Expenses</h3>
            <p className="text-muted-foreground">
              You don't have any expenses assigned to you at the moment.
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
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Assigned Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {assignments.map(assignment => {
              const data = formData[assignment.id] || {
                customer: '',
                assignToProject: false,
                billable: false,
                category: 'Other',
                description: '',
                selectedProject: null
              };
              return (
                <Card key={assignment.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {formatDate(assignment.expenses.expense_date)}
                          </span>
                          {getStatusBadge(assignment.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {assignment.expenses.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium">
                            {formatCurrency(assignment.expenses.net)}
                          </span>
                          <span>Customer: {assignment.expenses.customer || 'N/A'}</span>
                          {assignment.expenses.reference && (
                            <span>Ref: {assignment.expenses.reference}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.status === 'Assigned' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Customer</label>
                            <Select
                              value={data.customer}
                              onValueChange={(value) => updateFormData(assignment.id, 'customer', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {customers.map(customer => (
                                  <SelectItem key={customer.customer} value={customer.customer}>
                                    {customer.customer}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Category</label>
                            <Select
                              value={data.category}
                              onValueChange={(value) => updateFormData(assignment.id, 'category', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categoryOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`billable-${assignment.id}`}
                            checked={data.billable}
                            onCheckedChange={(checked) => updateFormData(assignment.id, 'billable', checked)}
                          />
                          <label htmlFor={`billable-${assignment.id}`} className="text-sm font-medium">
                            Billable
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`project-${assignment.id}`}
                            checked={data.assignToProject}
                            onCheckedChange={(checked) => updateFormData(assignment.id, 'assignToProject', checked)}
                          />
                          <label htmlFor={`project-${assignment.id}`} className="text-sm font-medium">
                            Assign to project
                          </label>
                        </div>

                        {data.assignToProject && (
                          <div>
                            <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  onClick={() => setCurrentAssignmentId(assignment.id)}
                                  className="w-full"
                                >
                                  <Building2 className="h-4 w-4 mr-2" />
                                  {data.selectedProject 
                                    ? `${data.selectedProject.customer_name} - ${data.selectedProject.project_name}`
                                    : 'Select Project'
                                  }
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Select Project</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-96 overflow-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Kind</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Site</TableHead>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {projects
                                        .filter(project => {
                                          const assignmentData = formData[currentAssignmentId || ''];
                                          if (!assignmentData?.customer || assignmentData.customer === 'No Customer') {
                                            return true; // Show all projects if no customer selected
                                          }
                                          return project.customer_name === assignmentData.customer;
                                        })
                                        .map(project => (
                                        <TableRow key={`${project.kind}-${project.project_id || project.solutions_project_id}`}>
                                          <TableCell>
                                            <Badge variant={project.kind === 'implementation' ? 'default' : 'secondary'}>
                                              {project.kind}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{project.customer_name}</TableCell>
                                          <TableCell>{project.site_name || 'N/A'}</TableCell>
                                          <TableCell>{project.project_name}</TableCell>
                                          <TableCell>
                                            <Button
                                              size="sm"
                                              onClick={() => handleProjectSelect(project)}
                                            >
                                              Select
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                          <Textarea
                            value={data.description}
                            onChange={(e) => updateFormData(assignment.id, 'description', e.target.value)}
                            placeholder="Add any additional notes..."
                            rows={3}
                          />
                        </div>

                        <Button
                          onClick={() => handleConfirmExpense(assignment.id)}
                          className="w-full"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Expense
                        </Button>
                      </>
                    )}

                    {assignment.status !== 'Assigned' && (
                      <div className="text-sm text-muted-foreground">
                        This expense has been confirmed and is now {assignment.status.toLowerCase()}.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};