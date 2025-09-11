import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SolutionsLine {
  id: string;
  line_name: string;
  camera_count: number;
  iot_device_count: number;
  min_speed?: number;
  max_speed?: number;
  created_at: string;
}

interface SolutionsLinesProps {
  solutionsProjectId: string;
}

export const SolutionsLines: React.FC<SolutionsLinesProps> = ({ solutionsProjectId }) => {
  const [lines, setLines] = useState<SolutionsLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<SolutionsLine | null>(null);
  const [formData, setFormData] = useState({
    line_name: '',
    min_speed: '',
    max_speed: '',
    camera_count: 0,
    iot_device_count: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLines();
  }, [solutionsProjectId]);

  const fetchLines = async () => {
    try {
      const { data, error } = await supabase
        .from('solutions_lines')
        .select('*')
        .eq('solutions_project_id', solutionsProjectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLines(data || []);
    } catch (error) {
      console.error('Error fetching lines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.line_name.trim()) {
      toast({
        title: "Error",
        description: "Line name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const lineData = {
        solutions_project_id: solutionsProjectId,
        line_name: formData.line_name.trim(),
        min_speed: formData.min_speed ? parseFloat(formData.min_speed) : null,
        max_speed: formData.max_speed ? parseFloat(formData.max_speed) : null,
        camera_count: formData.camera_count,
        iot_device_count: formData.iot_device_count,
      };

      if (editingLine) {
        const { error } = await supabase
          .from('solutions_lines')
          .update(lineData)
          .eq('id', editingLine.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Line updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('solutions_lines')
          .insert([lineData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Line created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchLines();
    } catch (error) {
      console.error('Error saving line:', error);
      toast({
        title: "Error",
        description: "Failed to save line",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (lineId: string) => {
    try {
      const { error } = await supabase
        .from('solutions_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line deleted successfully",
      });

      fetchLines();
    } catch (error) {
      console.error('Error deleting line:', error);
      toast({
        title: "Error",
        description: "Failed to delete line",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (line: SolutionsLine) => {
    setEditingLine(line);
    setFormData({
      line_name: line.line_name,
      min_speed: line.min_speed ? line.min_speed.toString() : '',
      max_speed: line.max_speed ? line.max_speed.toString() : '',
      camera_count: line.camera_count,
      iot_device_count: line.iot_device_count,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      line_name: '',
      min_speed: '',
      max_speed: '',
      camera_count: 0,
      iot_device_count: 0,
    });
    setEditingLine(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Production Lines</CardTitle>
            <CardDescription>
              Configure production lines for this solutions project
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Line
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {lines.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Lines Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first production line to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Line
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Name</TableHead>
                <TableHead>Speed Range</TableHead>
                <TableHead>Camera Count</TableHead>
                <TableHead>IoT Device Count</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.line_name}</TableCell>
                  <TableCell>
                    {line.min_speed !== undefined && line.max_speed !== undefined
                      ? `${line.min_speed} - ${line.max_speed} units/min`
                      : "Not specified"
                    }
                  </TableCell>
                  <TableCell>{line.camera_count}</TableCell>
                  <TableCell>{line.iot_device_count}</TableCell>
                  <TableCell>{new Date(line.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(line)}
                        title="Edit Line"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Line">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Line</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{line.line_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(line.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Line Creation/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Line' : 'Create New Line'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="line_name">Line Name</Label>
              <Input
                id="line_name"
                value={formData.line_name}
                onChange={(e) => setFormData(prev => ({ ...prev, line_name: e.target.value }))}
                placeholder="Enter line name"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_speed">Min Speed</Label>
                <Input
                  id="min_speed"
                  type="number"
                  step="0.1"
                  value={formData.min_speed}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_speed: e.target.value }))}
                  placeholder="units/min"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_speed">Max Speed</Label>
                <Input
                  id="max_speed"
                  type="number"
                  step="0.1"
                  value={formData.max_speed}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_speed: e.target.value }))}
                  placeholder="units/min"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camera_count">Camera Count</Label>
                <Input
                  id="camera_count"
                  type="number"
                  min="0"
                  value={formData.camera_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, camera_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="iot_device_count">IoT Device Count</Label>
                <Input
                  id="iot_device_count"
                  type="number"
                  min="0"
                  value={formData.iot_device_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, iot_device_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingLine ? 'Update Line' : 'Create Line'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SolutionsLines;