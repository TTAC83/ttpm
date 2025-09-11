import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LineWizard } from "@/components/line-builder/LineWizard";

interface Line {
  id: string;
  line_name: string;
  camera_count: number;
  iot_device_count: number;
  min_speed?: number;
  max_speed?: number;
  created_at: string;
}

interface ProjectLinesProps {
  projectId: string;
}

export const ProjectLines: React.FC<ProjectLinesProps> = ({ projectId }) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLines();
  }, [projectId]);

  const fetchLines = async () => {
    try {
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .eq('project_id', projectId)
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

  const handleDelete = async (lineId: string) => {
    try {
      const { error } = await supabase
        .from('lines')
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

  const handleWizardComplete = () => {
    fetchLines();
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
              Configure production lines with equipment, devices, and process flow
            </CardDescription>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
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
            <Button onClick={() => setWizardOpen(true)}>
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
                <TableHead className="w-[100px]">Actions</TableHead>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Line</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{line.line_name}"? This will also delete all equipment, devices, and configurations associated with this line. This action cannot be undone.
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

      {/* Line Creation Wizard */}
      <LineWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
        onComplete={handleWizardComplete}
      />
    </Card>
  );
};

export default ProjectLines;