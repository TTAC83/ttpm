import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Plus, Trash2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { wbsService } from '@/lib/wbsService';

interface DependencyPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'step' | 'task' | 'subtask';
  itemId: number;
  itemName: string;
  allSteps: Array<{id: number, name: string}>;
  allTasks: Array<{id: number, title: string, step_id: number}>;
  onDependencyChange: () => void;
}

export const DependencyPanel = ({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  allSteps,
  allTasks,
  onDependencyChange
}: DependencyPanelProps) => {
  const { toast } = useToast();
  const [dependencies, setDependencies] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [addingPredecessor, setAddingPredecessor] = useState(false);
  
  const [newPredType, setNewPredType] = useState<'step' | 'task' | 'subtask'>('task');
  const [newPredId, setNewPredId] = useState<number | null>(null);
  const [newDepType, setNewDepType] = useState<'FS' | 'SS' | 'FF' | 'SF'>('FS');
  const [newLagDays, setNewLagDays] = useState(0);

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open, itemType, itemId]);

  const loadDependencies = async () => {
    setLoading(true);
    try {
      const deps = await wbsService.getDependenciesForItem(itemType, itemId);
      setDependencies(deps);
    } catch (error) {
      console.error('Error loading dependencies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dependencies',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependency = async () => {
    if (!newPredId) {
      toast({
        title: 'Error',
        description: 'Please select a predecessor',
        variant: 'destructive'
      });
      return;
    }

    try {
      await wbsService.createDependency(
        newPredType,
        newPredId,
        itemType,
        itemId,
        newDepType,
        newLagDays
      );
      
      toast({
        title: 'Success',
        description: 'Dependency added successfully'
      });
      
      await loadDependencies();
      onDependencyChange();
      setAddingPredecessor(false);
      setNewPredId(null);
      setNewLagDays(0);
    } catch (error: any) {
      console.error('Error adding dependency:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add dependency',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDependency = async (depId: string) => {
    try {
      await wbsService.deleteDependency(depId);
      toast({
        title: 'Success',
        description: 'Dependency removed'
      });
      await loadDependencies();
      onDependencyChange();
    } catch (error) {
      console.error('Error deleting dependency:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove dependency',
        variant: 'destructive'
      });
    }
  };

  const getItemName = (type: string, id: number) => {
    if (type === 'step') {
      return allSteps.find(s => s.id === id)?.name || `Step #${id}`;
    } else {
      return allTasks.find(t => t.id === id)?.title || `Task #${id}`;
    }
  };

  const getDependencyTypeLabel = (type: string) => {
    switch (type) {
      case 'FS': return 'Finish → Start';
      case 'SS': return 'Start → Start';
      case 'FF': return 'Finish → Finish';
      case 'SF': return 'Start → Finish';
      default: return type;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Dependencies
          </SheetTitle>
          <SheetDescription>
            Manage dependencies for: <strong>{itemName}</strong>
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-6 mt-6">
              {/* PREDECESSORS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Depends On ({dependencies?.predecessors?.length || 0})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingPredecessor(!addingPredecessor)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                {addingPredecessor && (
                  <div className="border rounded-lg p-4 mb-3 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Predecessor Type</Label>
                        <Select value={newPredType} onValueChange={(v: any) => setNewPredType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="step">Step</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="subtask">Subtask</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Predecessor</Label>
                        <Select value={newPredId?.toString() || ''} onValueChange={(v) => setNewPredId(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {newPredType === 'step' ? (
                              allSteps.map(step => (
                                <SelectItem key={step.id} value={step.id.toString()}>
                                  {step.name}
                                </SelectItem>
                              ))
                            ) : (
                              allTasks.map(task => (
                                <SelectItem key={task.id} value={task.id.toString()}>
                                  {task.title}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Dependency Type</Label>
                        <Select value={newDepType} onValueChange={(v: any) => setNewDepType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FS">Finish → Start</SelectItem>
                            <SelectItem value="SS">Start → Start</SelectItem>
                            <SelectItem value="FF">Finish → Finish</SelectItem>
                            <SelectItem value="SF">Start → Finish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Lag Days</Label>
                        <Input
                          type="number"
                          value={newLagDays}
                          onChange={(e) => setNewLagDays(parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAddDependency} size="sm">
                        Add Dependency
                      </Button>
                      <Button onClick={() => setAddingPredecessor(false)} size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {dependencies?.predecessors?.length > 0 ? (
                  <div className="space-y-2">
                    {dependencies.predecessors.map((dep: any) => (
                      <div key={dep.dependency_id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{dep.predecessor_type}</Badge>
                            <span className="font-medium">{getItemName(dep.predecessor_type, dep.predecessor_id)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {getDependencyTypeLabel(dep.dependency_type)}
                            {dep.lag_days !== 0 && ` + ${dep.lag_days} days`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDependency(dep.dependency_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                    No predecessors. This item can start anytime.
                  </div>
                )}
              </div>

              <Separator />

              {/* SUCCESSORS */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Blocks ({dependencies?.successors?.length || 0})
                </h3>

                {dependencies?.successors?.length > 0 ? (
                  <div className="space-y-2">
                    {dependencies.successors.map((dep: any) => (
                      <div key={dep.dependency_id} className="border rounded-lg p-3 flex items-center justify-between bg-muted/20">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary">{dep.successor_type}</Badge>
                            <span className="font-medium">{getItemName(dep.successor_type, dep.successor_id)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {getDependencyTypeLabel(dep.dependency_type)}
                            {dep.lag_days !== 0 && ` + ${dep.lag_days} days`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDependency(dep.dependency_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                    No items depend on this.
                  </div>
                )}
              </div>

              <Separator />

              {/* INFO BOX */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Automatic Date Updates</p>
                    <p className="text-xs">
                      When you change dates on predecessor items, dates for this item will automatically update to maintain the dependency relationship.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
