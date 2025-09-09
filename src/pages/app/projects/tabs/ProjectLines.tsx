import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Line {
  id: string;
  line_name: string;
  camera_count: number;
  iot_device_count: number;
  created_at: string;
}

interface ProjectLinesProps {
  projectId: string;
}

const ProjectLines = ({ projectId }: ProjectLinesProps) => {
  const { toast } = useToast();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    line_name: '',
    camera_count: 0,
    iot_device_count: 0,
  });

  useEffect(() => {
    fetchLines();
  }, [projectId]);

  const fetchLines = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (error) throw error;
      setLines(data || []);
    } catch (error: any) {
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
    setFormLoading(true);

    try {
      if (editingLine) {
        // Update existing line
        const { error } = await supabase
          .from('lines')
          .update({
            line_name: formData.line_name,
            camera_count: formData.camera_count,
            iot_device_count: formData.iot_device_count,
          })
          .eq('id', editingLine.id);

        if (error) throw error;

        toast({
          title: "Line Updated",
          description: "Line has been updated successfully",
        });
      } else {
        // Create new line
        const { error } = await supabase
          .from('lines')
          .insert({
            project_id: projectId,
            line_name: formData.line_name,
            camera_count: formData.camera_count,
            iot_device_count: formData.iot_device_count,
          });

        if (error) throw error;

        toast({
          title: "Line Created",
          description: "New line has been created successfully",
        });
      }

      setDialogOpen(false);
      setEditingLine(null);
      setFormData({ line_name: '', camera_count: 0, iot_device_count: 0 });
      fetchLines();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save line",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (line: Line) => {
    setEditingLine(line);
    setFormData({
      line_name: line.line_name,
      camera_count: line.camera_count,
      iot_device_count: line.iot_device_count,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (lineId: string) => {
    if (!confirm('Are you sure you want to delete this line?')) return;

    try {
      const { error } = await supabase
        .from('lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      toast({
        title: "Line Deleted",
        description: "Line has been deleted successfully",
      });

      fetchLines();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete line",
        variant: "destructive",
      });
    }
  };

  const handleNewLine = () => {
    setEditingLine(null);
    setFormData({ line_name: '', camera_count: 0, iot_device_count: 0 });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Lines</CardTitle>
            <CardDescription>
              Manage production lines with camera and IoT device counts
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLine ? 'Edit Line' : 'Add New Line'}</DialogTitle>
                <DialogDescription>
                  Enter the line details including device counts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="line_name">Line Name *</Label>
                  <Input
                    id="line_name"
                    value={formData.line_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, line_name: e.target.value }))}
                    placeholder="Enter line name"
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? 'Saving...' : (editingLine ? 'Update Line' : 'Create Line')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
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
                <TableHead>Line Name</TableHead>
                <TableHead>Cameras</TableHead>
                <TableHead>IoT Devices</TableHead>
                <TableHead>Total Devices</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No lines configured</p>
                    <Button onClick={handleNewLine} size="sm" className="mt-2">
                      Add First Line
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.line_name}</TableCell>
                    <TableCell>{line.camera_count}</TableCell>
                    <TableCell>{line.iot_device_count}</TableCell>
                    <TableCell>{line.camera_count + line.iot_device_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(line)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(line.id)}
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
  );
};

export default ProjectLines;