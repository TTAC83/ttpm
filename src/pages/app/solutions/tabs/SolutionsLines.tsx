import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SolutionsLineWizard } from "@/components/solutions-line-builder/SolutionsLineWizard";

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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | undefined>(undefined);
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

  const handleWizardComplete = () => {
    fetchLines();
    setWizardOpen(false);
    setEditingLineId(undefined);
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
    setEditingLineId(line.id);
    setWizardOpen(true);
  };

  const handleCreateLine = () => {
    setEditingLineId(undefined);
    setWizardOpen(true);
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
          <Button onClick={handleCreateLine}>
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
            <Button onClick={handleCreateLine}>
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

      {/* Solutions Line Wizard */}
      <SolutionsLineWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        solutionsProjectId={solutionsProjectId}
        onComplete={handleWizardComplete}
        editLineId={editingLineId}
      />
    </Card>
  );
};

export default SolutionsLines;