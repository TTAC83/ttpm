import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { User, Building, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  account_code: string;
  account: string;
  expense_date: string;
  description: string;
  customer: string;
  gross: number;
  net: number;
}

interface AssignExpenseDialogProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isMultiAssignMode?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

interface User {
  user_id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

export const AssignExpenseDialog = ({ 
  expense, 
  isOpen, 
  onClose, 
  onSuccess, 
  isMultiAssignMode = false,
  currentIndex = 0,
  totalCount = 0 
}: AssignExpenseDialogProps) => {
  const [assignmentType, setAssignmentType] = useState<'user' | 'project'>('user');
  const [projectType, setProjectType] = useState<'implementation' | 'solutions'>('implementation');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSolutionsProjectId, setSelectedSolutionsProjectId] = useState<string>('');
  const [isBillable, setIsBillable] = useState(true);
  const [notes, setNotes] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [solutionsProjects, setSolutionsProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredSolutionsProjects, setFilteredSolutionsProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchProjects();
      fetchSolutionsProjects();
      fetchCustomers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCustomer) {
      if (projectType === 'implementation') {
        const filtered = projects.filter(project => 
          project.name.toLowerCase().includes(selectedCustomer.toLowerCase())
        );
        setFilteredProjects(filtered);
      } else {
        const filtered = solutionsProjects.filter(project => 
          project.name.toLowerCase().includes(selectedCustomer.toLowerCase())
        );
        setFilteredSolutionsProjects(filtered);
      }
    } else {
      setFilteredProjects(projects);
      setFilteredSolutionsProjects(solutionsProjects);
    }
  }, [selectedCustomer, projects, solutionsProjects, projectType]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_users_with_profiles');
      if (error) throw error;
      
      setUsers(data.map(user => ({
        user_id: user.user_id,
        name: user.name || user.email
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSolutionsProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('solutions_projects')
        .select('id, site_name')
        .order('site_name');
      
      if (error) throw error;
      setSolutionsProjects(data.map(project => ({
        id: project.id,
        name: project.site_name
      })));
    } catch (error) {
      console.error('Error fetching solutions projects:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Get unique customer names from projects and solutions projects
      const [projectsData, solutionsData] = await Promise.all([
        supabase.from('projects').select('name').order('name'),
        supabase.from('solutions_projects').select('site_name').order('site_name')
      ]);

      const customerSet = new Set<string>();
      
      if (projectsData.data) {
        projectsData.data.forEach(project => {
          // Extract customer name (assuming it's the first part before a delimiter)
          const customer = project.name.split(' - ')[0] || project.name.split(' ')[0];
          if (customer) customerSet.add(customer);
        });
      }

      if (solutionsData.data) {
        solutionsData.data.forEach(project => {
          const customer = project.site_name.split(' - ')[0] || project.site_name.split(' ')[0];
          if (customer) customerSet.add(customer);
        });
      }

      setCustomers(Array.from(customerSet).sort());
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const assignment = {
        expense_id: expense.id,
        assigned_to_user_id: assignmentType === 'user' ? selectedUserId : null,
        assigned_to_project_id: assignmentType === 'project' && projectType === 'implementation' ? selectedProjectId : null,
        assigned_to_solutions_project_id: assignmentType === 'project' && projectType === 'solutions' ? selectedSolutionsProjectId : null,
        is_billable: isBillable,
        assignment_notes: notes.trim() || null,
        assigned_by: (await supabase.auth.getUser()).data.user?.id
      };

      // Validate assignment
      if (assignmentType === 'user' && !selectedUserId) {
        toast({
          title: 'Error',
          description: 'Please select a user',
          variant: 'destructive',
        });
        return;
      }
      
      if (assignmentType === 'project') {
        if (projectType === 'implementation' && !selectedProjectId) {
          toast({
            title: 'Error',
            description: 'Please select an implementation project',
            variant: 'destructive',
          });
          return;
        }
        
        if (projectType === 'solutions' && !selectedSolutionsProjectId) {
          toast({
            title: 'Error',
            description: 'Please select a solutions project',
            variant: 'destructive',
          });
          return;
        }
      }

      const { error } = await supabase
        .from('expense_assignments')
        .insert(assignment);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error assigning expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign expense',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isMultiAssignMode ? `Multi Assign - Expense ${currentIndex + 1} of ${totalCount}` : 'Assign Expense'}
          </DialogTitle>
          <DialogDescription>
            {isMultiAssignMode 
              ? `Assigning expenses in bulk. After saving, you'll be taken to the next unassigned expense.`
              : 'Assign this expense to a user or project'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Expense Details */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{expense.account}</p>
                    <p className="text-sm text-muted-foreground">{expense.account_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">{formatCurrency(expense.net)}</p>
                    <p className="text-sm text-muted-foreground">Net amount</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(expense.expense_date)}
                </div>
                <p className="text-sm">{expense.description}</p>
                <p className="text-sm"><strong>Customer:</strong> {expense.customer}</p>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Type */}
          <div className="space-y-3">
            <Label>Assign to</Label>
            <RadioGroup value={assignmentType} onValueChange={(value: 'user' | 'project') => setAssignmentType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="project" />
                <Label htmlFor="project" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Project
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Project Type Selection */}
          {assignmentType === 'project' && (
            <div className="space-y-3">
              <Label>Project Type</Label>
              <RadioGroup value={projectType} onValueChange={(value: 'implementation' | 'solutions') => setProjectType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="implementation" id="implementation" />
                  <Label htmlFor="implementation">Implementation Project</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="solutions" id="solutions" />
                  <Label htmlFor="solutions">Solutions Project</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Customer Selection for Projects */}
          {assignmentType === 'project' && (
            <div className="space-y-2">
              <Label htmlFor="customer-select">Select Customer</Label>
              <Select value={selectedCustomer} onValueChange={(value) => {
                setSelectedCustomer(value);
                setSelectedProjectId('');
                setSelectedSolutionsProjectId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer} value={customer}>
                      {customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* User Selection */}
          {assignmentType === 'user' && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project Selection */}
          {assignmentType === 'project' && selectedCustomer && projectType === 'implementation' && (
            <div className="space-y-2">
              <Label htmlFor="project-select">Select Implementation Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Solutions Project Selection */}
          {assignmentType === 'project' && selectedCustomer && projectType === 'solutions' && (
            <div className="space-y-2">
              <Label htmlFor="solutions-select">Select Solutions Project</Label>
              <Select value={selectedSolutionsProjectId} onValueChange={setSelectedSolutionsProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a solutions project..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredSolutionsProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Billable Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              checked={isBillable}
              onCheckedChange={(checked) => setIsBillable(checked as boolean)}
            />
            <Label htmlFor="billable">This expense is billable</Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Expense'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};