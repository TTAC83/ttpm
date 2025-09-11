import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Database, List, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface MasterStep {
  id: number;
  name: string;
  position: number;
  technology_scope: string;
}

interface MasterTask {
  id: number;
  step_id: number;
  title: string;
  details: string | null;
  planned_start_offset_days: number;
  planned_end_offset_days: number;
  position: number;
  master_steps?: {
    name: string;
  };
}

export const MasterDataManagement = () => {
  const { isInternalAdmin } = useAuth();
  const { toast } = useToast();
  
  const [steps, setSteps] = useState<MasterStep[]>([]);
  const [tasks, setTasks] = useState<MasterTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<MasterStep | null>(null);
  const [editingTask, setEditingTask] = useState<MasterTask | null>(null);

  useEffect(() => {
    if (isInternalAdmin()) {
      fetchMasterData();
    }
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      
      const [stepsResponse, tasksResponse] = await Promise.all([
        supabase.from('master_steps').select('*').order('position'),
        supabase.from('master_tasks').select(`
          *,
          master_steps (
            name
          )
        `).order('step_id').order('position')
      ]);

      if (stepsResponse.error) throw stepsResponse.error;
      if (tasksResponse.error) throw tasksResponse.error;

      setSteps(stepsResponse.data || []);
      setTasks(tasksResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch master data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async (stepData: { name: string; position: number; technology_scope: string }) => {
    try {
      if (editingStep) {
        const { error } = await supabase
          .from('master_steps')
          .update(stepData)
          .eq('id', editingStep.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_steps')
          .insert(stepData);
        if (error) throw error;
      }

      toast({
        title: editingStep ? "Step Updated" : "Step Created",
        description: `Master step has been ${editingStep ? 'updated' : 'created'} successfully`,
      });

      setStepDialogOpen(false);
      setEditingStep(null);
      fetchMasterData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save step",
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = async (taskData: { 
    step_id: number; 
    title: string; 
    details?: string; 
    planned_start_offset_days: number;
    planned_end_offset_days: number;
    position: number;
  }) => {
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('master_tasks')
          .update(taskData)
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_tasks')
          .insert(taskData);
        if (error) throw error;
      }

      toast({
        title: editingTask ? "Task Updated" : "Task Created",
        description: `Master task has been ${editingTask ? 'updated' : 'created'} successfully`,
      });

      setTaskDialogOpen(false);
      setEditingTask(null);
      fetchMasterData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!confirm('Are you sure you want to delete this step? This will also delete all associated tasks.')) return;

    try {
      const { error } = await supabase
        .from('master_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      toast({
        title: "Step Deleted",
        description: "Master step has been deleted successfully",
      });

      fetchMasterData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete step",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('master_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Deleted",
        description: "Master task has been deleted successfully",
      });

      fetchMasterData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  if (!isInternalAdmin()) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-8">
            <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Master data management is only available to internal administrators</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Data Management</h1>
          <p className="text-muted-foreground">
            Manage project steps and task templates
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">Important Notice</h4>
              <p className="text-sm text-orange-700">
                Changes to master data affect <strong>NEW projects only</strong>. Existing projects and their tasks will not be modified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Master Steps</CardTitle>
                  <CardDescription>
                    Manage project step categories
                  </CardDescription>
                </div>
                <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingStep(null); setStepDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <StepDialog
                      step={editingStep}
                      onSave={handleSaveStep}
                      onClose={() => { setStepDialogOpen(false); setEditingStep(null); }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Technology Scope</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {steps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <List className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No master steps found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      steps.map((step) => (
                        <TableRow key={step.id}>
                          <TableCell>{step.position}</TableCell>
                          <TableCell className="font-medium">{step.name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              step.technology_scope === 'iot' ? 'bg-blue-100 text-blue-800' :
                              step.technology_scope === 'vision' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {step.technology_scope === 'iot' ? 'IoT' : 
                               step.technology_scope === 'vision' ? 'Vision' : 
                               'Both'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingStep(step); setStepDialogOpen(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStep(step.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Master Tasks</CardTitle>
                  <CardDescription>
                    Manage task templates with timing offsets
                  </CardDescription>
                </div>
                <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <TaskDialog
                      task={editingTask}
                      steps={steps}
                      onSave={handleSaveTask}
                      onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Step</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Start Offset</TableHead>
                      <TableHead>End Offset</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <List className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No master tasks found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.master_steps?.name}</TableCell>
                          <TableCell>{task.position}</TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.planned_start_offset_days} days</TableCell>
                          <TableCell>{task.planned_end_offset_days} days</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Step Dialog Component
const StepDialog = ({ 
  step, 
  onSave, 
  onClose 
}: {
  step: MasterStep | null;
  onSave: (data: Partial<MasterStep>) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: step?.name || '',
    position: step?.position || 0,
    iot: step?.technology_scope === 'iot' || step?.technology_scope === 'both' || !step,
    vision: step?.technology_scope === 'vision' || step?.technology_scope === 'both' || !step,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const technology_scope = formData.iot && formData.vision ? 'both' : 
                               formData.iot ? 'iot' : 
                               formData.vision ? 'vision' : 'both';
      
      await onSave({
        name: formData.name,
        position: formData.position,
        technology_scope
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{step ? 'Edit Step' : 'Create New Step'}</DialogTitle>
        <DialogDescription>
          {step ? 'Update the step details' : 'Add a new master step'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Step Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter step name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            type="number"
            min="0"
            value={formData.position}
            onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
            placeholder="Step order position"
          />
        </div>
        <div className="space-y-3">
          <Label>Technology Scope *</Label>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="iot"
                checked={formData.iot}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, iot: checked as boolean }))}
              />
              <Label htmlFor="iot">IoT</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="vision"
                checked={formData.vision}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vision: checked as boolean }))}
              />
              <Label htmlFor="vision">Vision</Label>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading || !formData.name || (!formData.iot && !formData.vision)}>
            {loading ? 'Saving...' : (step ? 'Update Step' : 'Create Step')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
};

// Task Dialog Component
const TaskDialog = ({ 
  task, 
  steps, 
  onSave, 
  onClose 
}: {
  task: MasterTask | null;
  steps: MasterStep[];
  onSave: (data: Partial<MasterTask>) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    step_id: task?.step_id || 0,
    title: task?.title || '',
    details: task?.details || '',
    planned_start_offset_days: task?.planned_start_offset_days || 0,
    planned_end_offset_days: task?.planned_end_offset_days || 1,
    position: task?.position || 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        <DialogDescription>
          {task ? 'Update the task template' : 'Add a new master task template'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="step_id">Step *</Label>
          <select
            id="step_id"
            value={formData.step_id}
            onChange={(e) => setFormData(prev => ({ ...prev, step_id: parseInt(e.target.value) }))}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value={0}>Select a step</option>
            {steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter task title"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            value={formData.details}
            onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
            placeholder="Enter task details"
            rows={3}
          />
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start_offset">Start Offset (days)</Label>
            <Input
              id="start_offset"
              type="number"
              min="0"
              value={formData.planned_start_offset_days}
              onChange={(e) => setFormData(prev => ({ ...prev, planned_start_offset_days: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_offset">End Offset (days)</Label>
            <Input
              id="end_offset"
              type="number"
              min="1"
              value={formData.planned_end_offset_days}
              onChange={(e) => setFormData(prev => ({ ...prev, planned_end_offset_days: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              type="number"
              min="0"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading || !formData.title || !formData.step_id}>
            {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
};

export default MasterDataManagement;