import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type MasterStep, type MasterTask, wbsService } from "@/lib/wbsService";
import { SubTaskManager } from "@/components/SubTaskManager";


interface WBSTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  step: MasterStep;
  tasks: MasterTask[];
  onSave: (tasks: MasterTask[]) => void;
}

export function WBSTaskDialog({ isOpen, onClose, step, tasks, onSave }: WBSTaskDialogProps) {
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<MasterTask | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<MasterTask | null>(null);
  
  const [newTask, setNewTask] = useState<Partial<MasterTask>>({
    title: "",
    details: "",
    technology_scope: "both",
    assigned_role: "implementation_lead",
    planned_start_offset_days: 0,
    planned_end_offset_days: 1,
    position: tasks.length + 1,
    parent_task_id: null
  });

  const getTechnologyScopeColor = (scope: string) => {
    switch (scope) {
      case "both": return "default";
      case "iot": return "secondary";
      case "vision": return "outline";
      default: return "outline";
    }
  };

  const handleSaveTask = () => {
    if (editingTask) {
      const updatedTasks = tasks.map(task => 
        task.id === editingTask.id ? editingTask : task
      );
      onSave(updatedTasks);
      setEditingTask(null);
      toast({ title: "Task updated successfully" });
    }
  };

  const handleAddTask = () => {
    if (!newTask.title?.trim()) {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: "Task title is required" 
      });
      return;
    }

    const task: MasterTask = {
      id: Date.now(), // Temporary ID
      step_id: step.id,
      title: newTask.title!,
      details: newTask.details || "",
      planned_start_offset_days: newTask.planned_start_offset_days || 0,
      planned_end_offset_days: newTask.planned_end_offset_days || 1,
      duration_days: 1,
      position: newTask.position || tasks.length + 1,
      technology_scope: newTask.technology_scope as string,
      assigned_role: newTask.assigned_role as string,
      parent_task_id: null,
      subtasks: []
    };

    onSave([...tasks, task]);
    setNewTask({
      title: "",
      details: "",
      technology_scope: "both",
      assigned_role: "implementation_lead",
      planned_start_offset_days: 0,
      planned_end_offset_days: 1,
      position: tasks.length + 2
    });
    setIsAddingTask(false);
    toast({ title: "Task added successfully" });
  };

  const handleDeleteTask = () => {
    if (deletePassword !== "Office365") {
      toast({
        variant: "destructive",
        title: "Incorrect password",
        description: "Please enter the correct password to delete this task"
      });
      return;
    }

    if (taskToDelete) {
      const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
      onSave(updatedTasks);
      setTaskToDelete(null);
      setDeletePassword("");
      toast({ title: "Task deleted successfully" });
    }
  };

  // Sub-task management handlers
  const handleSubTaskCreate = async (parentTaskId: number, subTask: Omit<MasterTask, "id" | "parent_task_id" | "subtasks">) => {
    try {
      await wbsService.createSubTask(parentTaskId, subTask);
      // Recalculate parent task and step dates
      await wbsService.recalculateTaskAndStepDates(parentTaskId, step.id);
      // Reload tasks to get updated hierarchy
      const updatedTasks = await wbsService.getStepTasks(step.id);
      onSave(updatedTasks);
      toast({ title: "Sub-task created successfully" });
    } catch (error) {
      console.error("Error creating sub-task:", error);
      toast({ title: "Failed to create sub-task", variant: "destructive" });
    }
  };

  const handleSubTaskUpdate = async (taskId: number, updates: Partial<MasterTask>) => {
    try {
      // Check if dates changed
      const task = tasks.find(t => t.subtasks?.some(st => st.id === taskId));
      const parentTaskId = task?.id;
      
      await wbsService.updateMasterTask(taskId, updates);
      
      // Recalculate parent task and step dates if dates were updated
      if (parentTaskId && (updates.planned_start_offset_days !== undefined || updates.planned_end_offset_days !== undefined)) {
        await wbsService.recalculateTaskAndStepDates(parentTaskId, step.id);
      }
      
      // Reload tasks to get updated hierarchy
      const updatedTasks = await wbsService.getStepTasks(step.id);
      onSave(updatedTasks);
      toast({ title: "Sub-task updated successfully" });
    } catch (error) {
      console.error("Error updating sub-task:", error);
      toast({ title: "Failed to update sub-task", variant: "destructive" });
    }
  };

  const handleSubTaskDelete = async (taskId: number) => {
    try {
      // Find parent task before deleting
      const task = tasks.find(t => t.subtasks?.some(st => st.id === taskId));
      const parentTaskId = task?.id;
      
      await wbsService.deleteMasterTask(taskId);
      
      // Recalculate parent task and step dates
      if (parentTaskId) {
        await wbsService.recalculateTaskAndStepDates(parentTaskId, step.id);
      }
      
      // Reload tasks to get updated hierarchy
      const updatedTasks = await wbsService.getStepTasks(step.id);
      onSave(updatedTasks);
      toast({ title: "Sub-task deleted successfully" });
    } catch (error) {
      console.error("Error deleting sub-task:", error);
      toast({ title: "Failed to delete sub-task", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step.step_name} - Task Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="tasks" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="add">Add New Task</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 overflow-y-auto h-[600px]">
            {tasks.map((task) => (
              <Card key={task.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {editingTask?.id === task.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingTask.title}
                            onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                            placeholder="Task title"
                          />
                          <Textarea
                            value={editingTask.details || ""}
                            onChange={(e) => setEditingTask({ ...editingTask, details: e.target.value })}
                            placeholder="Task details"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select 
                              value={editingTask.technology_scope} 
                              onValueChange={(value) => setEditingTask({ ...editingTask, technology_scope: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="both">Both (IoT + Vision)</SelectItem>
                                <SelectItem value="iot">IoT Only</SelectItem>
                                <SelectItem value="vision">Vision Only</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select 
                              value={editingTask.assigned_role} 
                              onValueChange={(value) => setEditingTask({ ...editingTask, assigned_role: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="implementation_lead">Implementation Lead</SelectItem>
                                <SelectItem value="ai_iot_engineer">AI/IoT Engineer</SelectItem>
                                <SelectItem value="technical_project_lead">Technical Lead</SelectItem>
                                <SelectItem value="project_coordinator">Project Coordinator</SelectItem>
                                <SelectItem value="customer_project_lead">Customer Lead</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              value={editingTask.planned_start_offset_days}
                              onChange={(e) => setEditingTask({ ...editingTask, planned_start_offset_days: parseInt(e.target.value) })}
                              placeholder="Start days"
                            />
                            <Input
                              type="number"
                              value={editingTask.planned_end_offset_days}
                              onChange={(e) => setEditingTask({ ...editingTask, planned_end_offset_days: parseInt(e.target.value) })}
                              placeholder="End days"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveTask}>
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTask(null)}>
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-base">{task.title}</CardTitle>
                          {task.details && (
                            <p className="text-sm text-muted-foreground mt-1">{task.details}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {editingTask?.id !== task.id && (
                      <div className="flex items-center gap-2">
                        <Badge variant={getTechnologyScopeColor(task.technology_scope)}>
                          {task.technology_scope === "both" ? "B" : task.technology_scope === "iot" ? "I" : "V"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.subtasks && task.subtasks.length > 0 ? "🔄 " : ""}
                          {task.planned_start_offset_days}-{task.planned_end_offset_days}d
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingTask(task)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setTaskToDelete(task)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Enter the password to delete this task permanently.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                type="password"
                                placeholder="Enter password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => { setTaskToDelete(null); setDeletePassword(""); }}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTask}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {editingTask?.id !== task.id && (
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground mb-3">
                      <strong>Assigned:</strong> {task.assigned_role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                     
                    <Separator className="my-3" />
                    
                    {/* Sub-task Management */}
                    <SubTaskManager
                      parentTask={task}
                      onSubTaskCreate={(subTask) => handleSubTaskCreate(task.id, subTask)}
                      onSubTaskUpdate={handleSubTaskUpdate}
                      onSubTaskDelete={handleSubTaskDelete}
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
                <Textarea
                  value={newTask.details}
                  onChange={(e) => setNewTask({ ...newTask, details: e.target.value })}
                  placeholder="Task details (optional)"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Technology Scope</label>
                    <Select 
                      value={newTask.technology_scope} 
                      onValueChange={(value) => setNewTask({ ...newTask, technology_scope: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both (IoT + Vision)</SelectItem>
                        <SelectItem value="iot">IoT Only</SelectItem>
                        <SelectItem value="vision">Vision Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assigned Role</label>
                    <Select 
                      value={newTask.assigned_role} 
                      onValueChange={(value) => setNewTask({ ...newTask, assigned_role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="implementation_lead">Implementation Lead</SelectItem>
                        <SelectItem value="ai_iot_engineer">AI/IoT Engineer</SelectItem>
                        <SelectItem value="technical_project_lead">Technical Lead</SelectItem>
                        <SelectItem value="project_coordinator">Project Coordinator</SelectItem>
                        <SelectItem value="customer_project_lead">Customer Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Offset (days)</label>
                    <Input
                      type="number"
                      value={newTask.planned_start_offset_days}
                      onChange={(e) => setNewTask({ ...newTask, planned_start_offset_days: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Offset (days)</label>
                    <Input
                      type="number"
                      value={newTask.planned_end_offset_days}
                      onChange={(e) => setNewTask({ ...newTask, planned_end_offset_days: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <Button onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}