import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { Combobox } from '@/components/ui/combobox';
import { FileText, Building2, Users, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { confirmMyExpense, type Customer, type Project } from '@/lib/expenseService';
import { linkExpenseToBau, type BAUCustomer } from '@/lib/bauService';

// Customer suggestion component - matching the one from AssignedExpensesForm
interface CustomerSuggestComboboxProps {
  customers: Customer[];
  projects: Project[];
  bauCustomers: BAUCustomer[];
  assignmentType: 'none' | 'project' | 'bau';
  value: string;
  onValueChange: (value: string) => void;
  originalCustomer?: string;
}

const CustomerSuggestCombobox = ({ 
  customers, 
  projects, 
  bauCustomers, 
  assignmentType, 
  value, 
  onValueChange,
  originalCustomer 
}: CustomerSuggestComboboxProps) => {
  const suggestedCustomers = useMemo(() => {
    const customerSet = new Set<string>();
    
    // Always include the original customer if it exists
    if (originalCustomer && originalCustomer.trim()) {
      customerSet.add(originalCustomer);
    }
    
    // Add suggested customers based on assignment type
    if (assignmentType === 'project') {
      // Suggest customers from projects
      projects.forEach(project => {
        if (project.customer_name && project.customer_name.trim()) {
          customerSet.add(project.customer_name);
        }
      });
    } else if (assignmentType === 'bau') {
      // Suggest customers from BAU customers
      bauCustomers.forEach(bau => {
        if (bau.name && bau.name.trim()) {
          customerSet.add(bau.name);
        }
      });
    }
    
    // Add all customers from the general customer list
    customers.forEach(customer => {
      if (customer.customer && customer.customer.trim()) {
        customerSet.add(customer.customer);
      }
    });
    
    // Convert to array and sort
    return Array.from(customerSet)
      .filter(name => name !== 'No Customer' && name !== 'N/A')
      .sort()
      .map(name => ({
        value: name,
        label: name
      }));
  }, [customers, projects, bauCustomers, assignmentType, originalCustomer]);

  return (
    <Combobox
      options={suggestedCustomers}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select or type customer name"
      searchPlaceholder="Search customers..."
      emptyMessage="No customers found."
    />
  );
};

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

interface ExpenseDetailSidebarProps {
  expense: any;
  customers: Customer[];
  projects: Project[];
  bauCustomers: BAUCustomer[];
  onExpenseUpdate: () => void;
}

export const ExpenseDetailSidebar = ({
  expense,
  customers,
  projects,
  bauCustomers,
  onExpenseUpdate
}: ExpenseDetailSidebarProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    customer: '',
    assignmentType: 'none' as 'none' | 'project' | 'bau',
    billable: true,
    category: 'Other',
    description: '',
    selectedProject: null as Project | null,
    selectedBauCustomer: null as BAUCustomer | null
  });
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [bauDialogOpen, setBauDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      setFormData({
        customer: expense.customer || expense.import_customer || '',
        assignmentType: 'none',
        billable: expense.is_billable ?? true,
        category: expense.category || 'Other',
        description: expense.assignee_description || '',
        selectedProject: null,
        selectedBauCustomer: null
      });
    }
  }, [expense]);

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount) return '£0.00';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const handleProjectSelect = (project: Project) => {
    setFormData(prev => ({ ...prev, selectedProject: project }));
    setProjectDialogOpen(false);
  };

  const handleBauCustomerSelect = (bauCustomer: BAUCustomer) => {
    setFormData(prev => ({ ...prev, selectedBauCustomer: bauCustomer }));
    setBauDialogOpen(false);
  };

  const handleUpdateExpense = async () => {
    if (!expense) return;
    
    setUpdating(true);
    try {
      // Update expense assignment
      await confirmMyExpense(
        expense.id,
        formData.customer,
        formData.billable,
        formData.category as any,
        formData.description,
        formData.assignmentType === 'project',
        formData.selectedProject?.kind,
        formData.selectedProject?.project_id || formData.selectedProject?.solutions_project_id
      );

      // If BAU customer selected, link the expense
      if (formData.assignmentType === 'bau' && formData.selectedBauCustomer) {
        await linkExpenseToBau(expense.id, formData.selectedBauCustomer.id, formData.billable);
      }

      toast({
        title: 'Success',
        description: 'Expense updated successfully'
      });

      onExpenseUpdate();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to update expense',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!expense) {
    return (
      <Sidebar className="w-80 border-r">
        <SidebarContent className="p-4">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select an expense to view details</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="w-80 border-r">
      <SidebarHeader className="p-4 border-b">
        <h3 className="font-semibold">Expense Details</h3>
      </SidebarHeader>
      
      <SidebarContent className="p-4 space-y-4">
        {/* Expense Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Expense Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Date:</span> {formatDate(expense.expense_date)}
            </div>
            <div>
              <span className="font-medium">Amount:</span> {formatCurrency(expense.net || expense.gross)}
            </div>
            <div>
              <span className="font-medium">Description:</span>
              <p className="text-muted-foreground mt-1">{expense.expense_description || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">Original Customer:</span> {expense.customer || expense.import_customer || 'N/A'}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Form - Matching AssignedExpensesForm exactly */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer and Category - Grid Layout like original */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Customer</label>
                <CustomerSuggestCombobox
                  customers={customers}
                  projects={projects}
                  bauCustomers={bauCustomers}
                  assignmentType={formData.assignmentType}
                  value={formData.customer}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customer: value }))}
                  originalCustomer={expense.customer || expense.import_customer}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
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

            {/* Billable - matching original layout */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billable"
                checked={formData.billable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, billable: !!checked }))}
              />
              <label htmlFor="billable" className="text-sm font-medium">
                Billable
              </label>
            </div>

            {/* Assignment Type - matching original layout */}
            <div>
              <label className="text-sm font-medium mb-3 block">Assignment Type</label>
              <RadioGroup
                value={formData.assignmentType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignmentType: value as any }))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="text-sm">No specific assignment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="project" id="project" />
                  <Label htmlFor="project" className="text-sm">Assign to project</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bau" id="bau" />
                  <Label htmlFor="bau" className="text-sm">Assign to BAU customer</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Project Selection - matching original */}
            {formData.assignmentType === 'project' && (
              <div>
                <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      {formData.selectedProject 
                        ? `${formData.selectedProject.customer_name} - ${formData.selectedProject.project_name}`
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
                              if (!formData.customer || formData.customer === 'No Customer') {
                                return true; // Show all projects if no customer selected
                              }
                              return project.customer_name === formData.customer;
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
                                <Button size="sm" onClick={() => handleProjectSelect(project)}>
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

            {/* BAU Customer Selection - matching original */}
            {formData.assignmentType === 'bau' && (
              <div>
                <Dialog open={bauDialogOpen} onOpenChange={setBauDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      {formData.selectedBauCustomer 
                        ? `${formData.selectedBauCustomer.name} ${formData.selectedBauCustomer.site_name ? `- ${formData.selectedBauCustomer.site_name}` : ''}`
                        : 'Select BAU Customer'
                      }
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Select BAU Customer</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer Name</TableHead>
                            <TableHead>Site</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Health</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bauCustomers.map(bauCustomer => (
                            <TableRow key={bauCustomer.id}>
                              <TableCell className="font-medium">{bauCustomer.name}</TableCell>
                              <TableCell>{bauCustomer.site_name || 'N/A'}</TableCell>
                              <TableCell>{bauCustomer.company_name}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  bauCustomer.health === 'Excellent' ? 'default' :
                                  bauCustomer.health === 'Good' ? 'secondary' :
                                  bauCustomer.health === 'Watch' ? 'outline' :
                                  bauCustomer.health === 'AtRisk' ? 'destructive' : 'outline'
                                }>
                                  {bauCustomer.health}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" onClick={() => handleBauCustomerSelect(bauCustomer)}>
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

            {/* Description - matching original exactly */}
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            {/* Update Button - matching original */}
            <Button 
              onClick={handleUpdateExpense} 
              disabled={updating}
              className="w-full"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Assignment
            </Button>
          </CardContent>
        </Card>
      </SidebarContent>
    </Sidebar>
  );
};