import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { confirmMyExpense, getCustomers, getAllProjectsForSelection, getExpenseCategories } from '@/lib/expenseService';
import { useToast } from '@/hooks/use-toast';

interface ExpenseReviewDialogProps {
  expense: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExpenseReviewDialog = ({ expense, open, onClose, onSuccess }: ExpenseReviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<'implementation' | 'solutions' | 'bau' | 'internal'>('internal');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [billable, setBillable] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const { toast } = useToast();

  const categories = getExpenseCategories();
  const isReadOnly = expense?.status !== 'Assigned';

  useEffect(() => {
    if (open && expense) {
      // Pre-fill with existing data if available
      setSelectedCustomer(expense.customer || '');
      setBillable(expense.is_billable || false);
      setCategory(expense.category || '');
      setDescription(expense.assignee_description || '');
      
      // Determine target type from existing assignment
      if (expense.assigned_to_project_id) {
        setTargetType('implementation');
        setSelectedProject(expense.assigned_to_project_id);
      } else if (expense.assigned_to_solutions_project_id) {
        setTargetType('solutions');
        setSelectedProject(expense.assigned_to_solutions_project_id);
      } else if (expense.customer && customers.find(c => c.name === expense.customer)) {
        setTargetType('bau');
      } else {
        setTargetType('internal');
      }

      fetchData();
    }
  }, [open, expense]);

  const fetchData = async () => {
    try {
      const [projectsData, customersData] = await Promise.all([
        getAllProjectsForSelection(),
        getCustomers()
      ]);
      setProjects(projectsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load projects and customers",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const customer = targetType === 'bau' 
      ? selectedCustomer 
      : targetType === 'internal' 
      ? 'Internal' 
      : projects.find(p => p.id === selectedProject)?.customer || '';

    if (!customer) {
      toast({
        title: "Validation Error",
        description: "Please specify a customer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await confirmMyExpense(
        expense.id,
        customer,
        billable,
        category,
        description,
        ['implementation', 'solutions'].includes(targetType),
        targetType === 'implementation' ? 'implementation' : targetType === 'solutions' ? 'solutions' : null,
        selectedProject || null
      );

      toast({
        title: "Success",
        description: "Expense reviewed and submitted successfully",
      });
      onSuccess();
    } catch (error) {
      console.error('Error confirming expense:', error);
      toast({
        title: "Error",
        description: "Failed to submit expense review",
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isReadOnly ? 'Expense Details' : 'Review Expense'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Expense Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{expense.expense_description}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                {getStatusBadge(expense.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Import Customer:</span>
                  <div className="font-medium">{expense.import_customer}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Account:</span>
                  <div className="font-medium">{expense.account}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Account Code:</span>
                  <div className="font-medium">{expense.account_code}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <div className="font-medium">{expense.source}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-lg font-semibold">
                  Total: {formatCurrency(expense.gross)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Net: {formatCurrency(expense.net)} + VAT: {formatCurrency(expense.vat)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Review Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isReadOnly ? 'Assignment Details' : 'Assignment Review'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isReadOnly && (
                <div>
                  <Label className="text-base font-medium">Target Type</Label>
                  <RadioGroup value={targetType} onValueChange={(value: any) => setTargetType(value)} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="implementation" id="implementation" />
                      <Label htmlFor="implementation">Implementation Project</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="solutions" id="solutions" />
                      <Label htmlFor="solutions">Solutions Project</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bau" id="bau" />
                      <Label htmlFor="bau">BAU Customer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="internal" id="internal" />
                      <Label htmlFor="internal">Internal</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {(targetType === 'implementation' || targetType === 'solutions') && (
                <div>
                  <Label htmlFor="project">
                    {targetType === 'implementation' ? 'Implementation' : 'Solutions'} Project
                  </Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter(p => targetType === 'implementation' ? p.type === 'implementation' : p.type === 'solutions')
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.customer}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetType === 'bau' && (
                <div>
                  <Label htmlFor="customer">BAU Customer</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.name} value={customer.name}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="billable">Billable</Label>
                <Switch
                  id="billable"
                  checked={billable}
                  onCheckedChange={setBillable}
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any additional notes..."
                  disabled={isReadOnly}
                />
              </div>

              {!isReadOnly && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={onClose} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};