import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Eye, Edit, Download, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LineVisualization } from "./LineVisualization";
import { LineImportDialog } from "./LineImportDialog";
import { exportLine, downloadLineExport } from "@/lib/lineExportService";

interface Line {
  id: string;
  line_name: string;
  camera_count: number;
  iot_device_count: number;
  min_speed?: number;
  max_speed?: number;
  created_at: string;
}

interface WizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  solutionsProjectId?: string;
  onComplete: () => void;
  editLineId?: string;
}

interface LinesTableProps {
  projectId: string;
  projectType: "implementation" | "solutions";
  tableName: "lines" | "solutions_lines";
  projectIdField: "project_id" | "solutions_project_id";
  description?: string;
  WizardComponent: React.ComponentType<WizardProps>;
}

export const LinesTable: React.FC<LinesTableProps> = ({
  projectId,
  projectType,
  tableName,
  projectIdField,
  description = "Configure production lines with equipment, devices, and process flow",
  WizardComponent,
}) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [editLineId, setEditLineId] = useState<string | undefined>(undefined);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportingLineId, setExportingLineId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLines();
  }, [projectId, tableName, projectIdField]);

  const fetchLines = async () => {
    try {
      const query = supabase.from(tableName) as any;
      const { data, error } = await query
        .select('*')
        .eq(projectIdField, projectId)
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
      const query = supabase.from(tableName) as any;
      const { error } = await query
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
    setWizardOpen(false);
    setEditLineId(undefined);
  };

  const handleViewLine = (lineId: string) => {
    setSelectedLineId(lineId);
  };

  const handleEditLine = (lineId: string) => {
    setEditLineId(lineId);
    setWizardOpen(true);
  };

  const handleCreateLine = () => {
    setEditLineId(undefined);
    setWizardOpen(true);
  };

  const handleBackToLines = () => {
    setSelectedLineId(null);
  };

  const handleExportLine = async (lineId: string, lineName: string) => {
    setExportingLineId(lineId);
    try {
      const data = await exportLine(lineId, projectType);
      const filename = `${lineName.replace(/\s+/g, "_")}_export_${new Date().toISOString().split("T")[0]}.json`;
      downloadLineExport(data, filename);
      toast({
        title: "Export Complete",
        description: `Line "${lineName}" exported successfully`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export line",
        variant: "destructive",
      });
    } finally {
      setExportingLineId(null);
    }
  };

  const handleImportComplete = () => {
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

  if (selectedLineId) {
    return <LineVisualization lineId={selectedLineId} onBack={handleBackToLines} />;
  }

  const wizardProps = projectType === "implementation" 
    ? { projectId, editLineId }
    : { solutionsProjectId: projectId, editLineId };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Production Lines</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Line
            </Button>
            <Button onClick={handleCreateLine}>
              <Plus className="mr-2 h-4 w-4" />
              Create Line
            </Button>
          </div>
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
                <TableHead className="w-[160px]">Actions</TableHead>
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewLine(line.id)}
                        title="View Line"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditLine(line.id)}
                        title="Edit Line"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExportLine(line.id, line.line_name)}
                        disabled={exportingLineId === line.id}
                        title="Export Line"
                      >
                        {exportingLineId === line.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
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
      <WizardComponent
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setEditLineId(undefined);
        }}
        {...wizardProps}
        onComplete={handleWizardComplete}
      />

      {/* Line Import Dialog */}
      <LineImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={projectId}
        projectType={projectType}
        onImportComplete={handleImportComplete}
      />
    </Card>
  );
};

export default LinesTable;
