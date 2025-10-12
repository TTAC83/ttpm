import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Database, 
  ChevronRight, 
  ChevronDown, 
  Settings,
  AlertTriangle,
  FolderPlus,
  FileText,
  Layers,
  List,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MasterDataGanttView } from '@/components/MasterDataGanttView';
import { wbsService } from '@/lib/wbsService';
import { DependencyPanel } from '@/components/DependencyPanel';
import { Link as LinkIcon } from 'lucide-react';

interface MasterStep {
  id: number;
  name: string;
  position: number;
  planned_start_offset_days?: number | null;
  planned_end_offset_days?: number | null;
}

interface MasterTask {
  id: number;
  step_id: number;
  title: string;
  details: string | null;
  planned_start_offset_days: number;
  planned_end_offset_days: number;
  duration_days: number;
  position: number;
  technology_scope: string;
  assigned_role: string | null;
  parent_task_id: number | null;
  subtasks?: MasterTask[];
  master_steps?: {
    name: string;
  };
}

interface TreeNode {
  id: string;
  type: 'step' | 'task' | 'subtask';
  data: MasterStep | MasterTask;
  children: TreeNode[];
  level: number;
}

export const MasterDataManagement = () => {
  const { isInternalAdmin } = useAuth();
  const { toast } = useToast();
  
  const [steps, setSteps] = useState<MasterStep[]>([]);
  const [tasks, setTasks] = useState<MasterTask[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingInline, setEditingInline] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'gantt'>('tree');
  const [dependencyPanelOpen, setDependencyPanelOpen] = useState(false);
  const [selectedForDependency, setSelectedForDependency] = useState<{
    type: 'step' | 'task' | 'subtask';
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (isInternalAdmin()) {
      fetchMasterData();
    }
  }, []);

  useEffect(() => {
    if (steps.length > 0 || tasks.length > 0) {
      buildTreeData();
    }
  }, [steps, tasks]);

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
      setTasks(organizeTaskHierarchy(tasksResponse.data || []));
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

  const organizeTaskHierarchy = (tasks: any[]): MasterTask[] => {
    const taskMap = new Map();
    const rootTasks: MasterTask[] = [];

    // First pass: create all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, subtasks: [] });
    });

    // Second pass: organize hierarchy
    tasks.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id);
      if (task.parent_task_id) {
        const parent = taskMap.get(task.parent_task_id);
        if (parent) {
          parent.subtasks.push(taskWithSubtasks);
        }
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });

    return rootTasks;
  };

  const buildTreeData = () => {
    const tree: TreeNode[] = [];

    steps.forEach(step => {
      const stepNode: TreeNode = {
        id: `step-${step.id}`,
        type: 'step',
        data: step,
        children: [],
        level: 0
      };

      // Add tasks for this step
      const stepTasks = tasks.filter(task => task.step_id === step.id && !task.parent_task_id);
      stepTasks.forEach(task => {
        const taskNode = buildTaskNode(task, 1);
        stepNode.children.push(taskNode);
      });

      tree.push(stepNode);
    });

    setTreeData(tree);
  };

  const buildTaskNode = (task: MasterTask, level: number): TreeNode => {
    const taskNode: TreeNode = {
      id: `task-${task.id}`,
      type: task.parent_task_id ? 'subtask' : 'task',
      data: task,
      children: [],
      level
    };

    // Add subtasks
    if (task.subtasks) {
      task.subtasks.forEach(subtask => {
        const subtaskNode = buildTaskNode(subtask, level + 1);
        taskNode.children.push(subtaskNode);
      });
    }

    return taskNode;
  };

  const toggleExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node);
    setSidebarOpen(true);
  };

  const startInlineEdit = (nodeId: string, currentValue: string) => {
    setEditingInline(nodeId);
    setInlineValue(currentValue);
  };

  const saveInlineEdit = async (nodeId: string) => {
    if (!editingInline || !inlineValue.trim()) return;

    try {
      const [type, id] = nodeId.split('-');
      
      if (type === 'step') {
        await supabase
          .from('master_steps')
          .update({ name: inlineValue.trim() })
          .eq('id', parseInt(id));
      } else {
        await supabase
          .from('master_tasks')
          .update({ title: inlineValue.trim() })
          .eq('id', parseInt(id));
      }

      await fetchMasterData();
      setEditingInline(null);
      setInlineValue('');
      
      toast({
        title: "Updated",
        description: "Item updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const cancelInlineEdit = () => {
    setEditingInline(null);
    setInlineValue('');
  };

  const addNewStep = async () => {
    try {
      const maxPosition = Math.max(...steps.map(s => s.position), 0);
      const { error } = await supabase
        .from('master_steps')
        .insert({ 
          name: 'New Step', 
          position: maxPosition + 1 
        });

      if (error) throw error;
      await fetchMasterData();
      
      toast({
        title: "Step Added",
        description: "New step created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create step",
        variant: "destructive",
      });
    }
  };

  const addNewTask = async (stepId: number, parentTaskId?: number) => {
    try {
      const stepTasks = tasks.filter(t => t.step_id === stepId && t.parent_task_id === parentTaskId);
      const maxPosition = Math.max(...stepTasks.map(t => t.position), 0);
      
      const { error } = await supabase
        .from('master_tasks')
        .insert({
          step_id: stepId,
          title: parentTaskId ? 'New Subtask' : 'New Task',
          details: '',
          planned_start_offset_days: 0,
          planned_end_offset_days: 1,
          duration_days: 1,
          position: maxPosition + 1,
          technology_scope: 'both',
          parent_task_id: parentTaskId || null
        });

      if (error) throw error;
      await fetchMasterData();
      
      // Auto-recalculate dates (parent task if subtask, step if main task)
      if (parentTaskId) {
        await wbsService.recalculateTaskAndStepDates(parentTaskId, stepId);
      } else {
        await wbsService.updateStepDatesFromTasks(stepId);
      }
      await fetchMasterData();
      
      toast({
        title: parentTaskId ? "Subtask Added" : "Task Added",
        description: `New ${parentTaskId ? 'subtask' : 'task'} created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create ${parentTaskId ? 'subtask' : 'task'}`,
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (nodeId: string) => {
    const [type, id] = nodeId.split('-');
    const itemName = type === 'step' ? 'step' : 'task';
    
    if (!confirm(`Are you sure you want to delete this ${itemName}? This will also delete all nested items.`)) {
      return;
    }

    try {
      let stepIdToRecalc: number | null = null;
      let parentTaskIdToRecalc: number | null = null;
      
      if (type === 'step') {
        await supabase.from('master_steps').delete().eq('id', parseInt(id));
      } else {
        // Get step_id and parent_task_id before deleting for recalculation
        const task = tasks.find(t => t.id === parseInt(id));
        stepIdToRecalc = task?.step_id || null;
        parentTaskIdToRecalc = task?.parent_task_id || null;
        await supabase.from('master_tasks').delete().eq('id', parseInt(id));
      }

      await fetchMasterData();
      
      // Recalculate dates if we deleted a task
      if (stepIdToRecalc) {
        if (parentTaskIdToRecalc) {
          // If it's a subtask, recalculate parent task and step dates
          await wbsService.recalculateTaskAndStepDates(parentTaskIdToRecalc, stepIdToRecalc);
        } else {
          // If it's a main task, just recalculate step dates
          await wbsService.updateStepDatesFromTasks(stepIdToRecalc);
        }
        await fetchMasterData();
      }
      
      setSidebarOpen(false);
      
      toast({
        title: "Deleted",
        description: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete ${itemName}`,
        variant: "destructive",
      });
    }
  };

  const recalculateAllSteps = async () => {
    try {
      setLoading(true);
      await wbsService.recalculateAllStepDates();
      await fetchMasterData();
      
      toast({
        title: "Recalculated",
        description: "All step dates have been recalculated from tasks",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to recalculate step dates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTechScopeColor = (scope: string) => {
    switch (scope) {
      case 'iot': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vision': return 'bg-green-100 text-green-800 border-green-200';
      case 'both': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTechScopeLabel = (scope: string) => {
    switch (scope) {
      case 'iot': return 'IoT';
      case 'vision': return 'Vision';
      case 'both': return 'Both';
      default: return scope;
    }
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingInline === node.id;
    
    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group transition-colors
            ${selectedNode?.id === node.id ? 'bg-muted' : ''}
          `}
          style={{ paddingLeft: `${node.level * 24 + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted-foreground/20"
            onClick={() => hasChildren && toggleExpansion(node.id)}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </Button>

          {/* Node Icon */}
          <div className="flex-shrink-0">
            {node.type === 'step' ? (
              <FolderPlus className="h-4 w-4 text-blue-600" />
            ) : node.type === 'task' ? (
              <FileText className="h-4 w-4 text-green-600" />
            ) : (
              <Layers className="h-4 w-4 text-orange-600" />
            )}
          </div>

          {/* Node Content */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {isEditing ? (
              <Input
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                onBlur={() => saveInlineEdit(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveInlineEdit(node.id);
                  if (e.key === 'Escape') cancelInlineEdit();
                }}
                className="h-7 text-sm"
                autoFocus
              />
            ) : (
              <>
                <span
                  className="font-medium text-sm cursor-pointer hover:text-primary truncate"
                  onClick={() => handleNodeClick(node)}
                  onDoubleClick={() => {
                    const name = node.type === 'step' 
                      ? (node.data as MasterStep).name 
                      : (node.data as MasterTask).title;
                    startInlineEdit(node.id, name);
                  }}
                >
                  {node.type === 'step' 
                    ? (node.data as MasterStep).name 
                    : (node.data as MasterTask).title}
                </span>
                
                {/* Show calculated step date range */}
                {node.type === 'step' && (node.data as MasterStep).planned_start_offset_days !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {(node.data as MasterStep).planned_start_offset_days !== null && (node.data as MasterStep).planned_end_offset_days !== null
                      ? `Days ${(node.data as MasterStep).planned_start_offset_days}-${(node.data as MasterStep).planned_end_offset_days}`
                      : 'No dates'}
                  </Badge>
                )}

                {/* Technology Scope Badge for Tasks */}
                {node.type !== 'step' && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0 ${getTechScopeColor((node.data as MasterTask).technology_scope)}`}
                  >
                    {getTechScopeLabel((node.data as MasterTask).technology_scope)}
                  </Badge>
                )}

                {/* Task Timing Info */}
                {node.type !== 'step' && (
                  <span className="text-xs text-muted-foreground">
                    {(node.data as MasterTask).planned_start_offset_days}d → {(node.data as MasterTask).planned_end_offset_days}d
                  </span>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.type === 'step' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => addNewTask((node.data as MasterStep).id)}
                title="Add task"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            
            {node.type === 'task' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => addNewTask((node.data as MasterTask).step_id, (node.data as MasterTask).id)}
                title="Add subtask"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const type = node.type as 'step' | 'task' | 'subtask';
                const id = node.type === 'step' 
                  ? (node.data as MasterStep).id 
                  : (node.data as MasterTask).id;
                const name = node.type === 'step'
                  ? (node.data as MasterStep).name
                  : (node.data as MasterTask).title;
                  
                setSelectedForDependency({ type, id, name });
                setDependencyPanelOpen(true);
              }}
              className="h-6 w-6 p-0"
              title="Manage Dependencies"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                const name = node.type === 'step' 
                  ? (node.data as MasterStep).name 
                  : (node.data as MasterTask).title;
                startInlineEdit(node.id, name);
              }}
              title="Edit"
            >
              <Edit className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => deleteItem(node.id)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
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
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main View */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Template</h1>
            <p className="text-muted-foreground">
              Manage project steps, tasks, and subtasks
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <List className={`h-4 w-4 ${viewMode === 'tree' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                checked={viewMode === 'gantt'}
                onCheckedChange={(checked) => setViewMode(checked ? 'gantt' : 'tree')}
              />
              <BarChart3 className={`h-4 w-4 ${viewMode === 'gantt' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">
                {viewMode === 'tree' ? 'Tree View' : 'Gantt View'}
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={recalculateAllSteps}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Recalculate Step Dates
            </Button>
            <Button onClick={addNewStep} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
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

        {/* Dynamic View */}
        {viewMode === 'tree' ? (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Project Structure</CardTitle>
                <Badge variant="outline" className="text-xs">
                  Double-click to rename
                </Badge>
              </div>
              <CardDescription>
                Expand steps to view tasks and subtasks. Technology scope filters apply to new projects.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="border rounded-md h-[calc(100vh-24rem)] overflow-auto bg-background">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No project structure found</p>
                      <p className="text-sm text-muted-foreground">Add a step to get started</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2">
                    {treeData.map(node => renderTreeNode(node))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 h-[calc(100vh-24rem)] overflow-hidden">
            <MasterDataGanttView
              steps={steps}
              tasks={tasks}
              onEditTask={(task) => {
                const taskNode: TreeNode = {
                  id: `task-${task.id}`,
                  type: task.parent_task_id ? 'subtask' : 'task',
                  data: task,
                  children: [],
                  level: task.parent_task_id ? 2 : 1
                };
                setSelectedNode(taskNode);
                setSidebarOpen(true);
              }}
              onAddTask={addNewTask}
              onDeleteTask={(taskId) => deleteItem(`task-${taskId}`)}
              onOpenDependencies={(type, id, name) => {
                setSelectedForDependency({ type, id, name });
                setDependencyPanelOpen(true);
              }}
              onRefresh={fetchMasterData}
            />
          </div>
        )}
      </div>

      {/* Detailed Sidebar */}
      {sidebarOpen && selectedNode && (
        <DetailSidebar
          node={selectedNode}
          onClose={() => setSidebarOpen(false)}
          onUpdate={fetchMasterData}
        />
      )}

      {/* Dependency Panel */}
      {selectedForDependency && (
        <DependencyPanel
          open={dependencyPanelOpen}
          onOpenChange={setDependencyPanelOpen}
          itemType={selectedForDependency.type}
          itemId={selectedForDependency.id}
          itemName={selectedForDependency.name}
          allSteps={steps.map(s => ({ id: s.id, name: s.name }))}
          allTasks={tasks.map(t => ({ id: t.id, title: t.title, step_id: t.step_id }))}
          onDependencyChange={() => {
            fetchMasterData();
          }}
        />
      )}
    </div>
  );
};

// Detail Sidebar Component
interface DetailSidebarProps {
  node: TreeNode;
  onClose: () => void;
  onUpdate: () => void;
}

const DetailSidebar = ({ node, onClose, onUpdate }: DetailSidebarProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node.type === 'step') {
      const step = node.data as MasterStep;
      setFormData({
        name: step.name,
        position: step.position
      });
    } else {
      const task = node.data as MasterTask;
      setFormData({
        title: task.title,
        details: task.details || '',
        duration_days: task.duration_days,
        planned_start_offset_days: task.planned_start_offset_days,
        planned_end_offset_days: task.planned_end_offset_days,
        position: task.position,
        technology_scope: task.technology_scope,
        assigned_role: task.assigned_role || 'implementation_lead'
      });
    }
  }, [node]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const [type, id] = node.id.split('-');
      let stepIdToRecalc: number | null = null;
      let parentTaskIdToRecalc: number | null = null;

      if (type === 'step') {
        const { error } = await supabase
          .from('master_steps')
          .update({
            name: formData.name,
            position: formData.position
          })
          .eq('id', parseInt(id))
          .select();

        if (error) {
          throw error;
        }
      } else {
        const task = node.data as MasterTask;
        stepIdToRecalc = task.step_id;
        parentTaskIdToRecalc = task.parent_task_id || null;
        
        const { data, error } = await supabase
          .from('master_tasks')
          .update({
            title: formData.title,
            details: formData.details,
            duration_days: formData.duration_days,
            position: formData.position,
            technology_scope: formData.technology_scope,
            assigned_role: formData.assigned_role || null
          })
          .eq('id', parseInt(id))
          .select();

        console.log('💾 master_tasks update result:', { data, error });
        if (error) {
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error('Update returned no rows. You may not have SELECT permission after update (RLS).');
        }
      }

      toast({
        title: "Updated",
        description: "Changes saved successfully",
      });

      // Recalculate dates based on what was updated
      if (stepIdToRecalc) {
        if (parentTaskIdToRecalc) {
          // If it's a subtask, recalculate parent task and step dates
          await wbsService.recalculateTaskAndStepDates(parentTaskIdToRecalc, stepIdToRecalc);
        } else {
          // If it's a main task, recalculate step dates
          await wbsService.updateStepDatesFromTasks(stepIdToRecalc);
        }
      }
      
      onUpdate();
    } catch (error: any) {
      console.error('❌ Save failed:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-border shadow-lg z-50 overflow-y-auto">
      <Card className="h-full border-0 rounded-none shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {node.type === 'step' ? 'Step Details' : 'Task Details'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {node.type === 'step' ? (
          <>
            <div>
              <Label htmlFor="step-name">Step Name</Label>
              <Input
                id="step-name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="step-position">Position</Label>
              <Input
                id="step-position"
                type="number"
                value={formData.position || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="p-4 bg-muted/30 rounded-md border border-border">
              <div className="text-sm font-medium mb-2">Calculated Dates</div>
              <div className="text-xs text-muted-foreground">
                {(node.data as MasterStep).planned_start_offset_days !== null && 
                 (node.data as MasterStep).planned_end_offset_days !== null ? (
                  <>
                    <div>Start: Day {(node.data as MasterStep).planned_start_offset_days}</div>
                    <div>End: Day {(node.data as MasterStep).planned_end_offset_days}</div>
                    <div className="mt-1 font-medium">
                      Duration: {((node.data as MasterStep).planned_end_offset_days! - (node.data as MasterStep).planned_start_offset_days! + 1)} days
                    </div>
                  </>
                ) : (
                  <div>No dates - add tasks to this step</div>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground italic">
                These dates are automatically calculated from associated tasks.
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="task-details">Details</Label>
              <Textarea
                id="task-details"
                value={formData.details || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration_days || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: Math.max(1, parseInt(e.target.value) || 1) }))}
                placeholder="Number of days this task will take"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many working days this task will take to complete
              </p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-md border border-border">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                📅 Calculated Timeline
                <Badge variant="outline" className="text-xs">Auto-calculated</Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Day:</span>
                  <span className="font-medium">{formData.planned_start_offset_days || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Day:</span>
                  <span className="font-medium">{formData.planned_end_offset_days || 0}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{formData.duration_days || 1} days</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground italic">
                Dates are calculated based on dependencies. Use the Dependencies panel to manage task flow.
              </div>
            </div>
            <div>
              <Label htmlFor="tech-scope">Technology Scope</Label>
              <Select 
                value={formData.technology_scope || 'both'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, technology_scope: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="both">Both (IoT + Vision)</SelectItem>
                  <SelectItem value="iot">IoT Only</SelectItem>
                  <SelectItem value="vision">Vision Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assigned-role">Assigned Role</Label>
              <Select 
                value={formData.assigned_role || 'implementation_lead'} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  assigned_role: value 
                }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="customer_project_lead">Customer Project Lead</SelectItem>
                  <SelectItem value="implementation_lead">Implementation Lead</SelectItem>
                  <SelectItem value="ai_iot_engineer">AI IoT Engineer</SelectItem>
                  <SelectItem value="project_coordinator">Project Coordinator</SelectItem>
                  <SelectItem value="technical_project_lead">Technical Project Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                type="number"
                value={formData.position || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) }))}
              />
            </div>
          </>
        )}
        
        <Button 
          onClick={handleSave} 
          disabled={loading} 
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
      </Card>
    </div>
  );
};

export default MasterDataManagement;