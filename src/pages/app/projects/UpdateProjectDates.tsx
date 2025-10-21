import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { projectDateUpdateService, UpdateResult } from '@/lib/projectDateUpdateService';
import { Loader2, Trash2, ArrowLeft } from 'lucide-react';

export const UpdateProjectDates = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [results, setResults] = useState<UpdateResult[] | null>(null);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, companies(name)')
        .eq('id', projectId!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  // Fetch configured task updates
  const { data: taskUpdates, isLoading: updatesLoading, refetch } = useQuery({
    queryKey: ['project-task-updates', projectId],
    queryFn: () => projectDateUpdateService.getProjectTaskUpdates(projectId!),
    enabled: !!projectId
  });

  const handleApplyUpdates = async () => {
    if (!projectId) return;

    setIsUpdating(true);
    setResults(null);

    try {
      const updateResults = await projectDateUpdateService.applyTaskUpdates(projectId);
      setResults(updateResults);

      const successCount = updateResults.filter(r => r.status === 'updated').length;
      const failedCount = updateResults.filter(r => r.status === 'failed').length;

      toast.success(`Update Complete: ${successCount} tasks updated${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update project dates");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearUpdates = async () => {
    if (!projectId || !confirm('Are you sure you want to clear all task updates for this project?')) return;

    try {
      await projectDateUpdateService.clearTaskUpdates(projectId);
      await refetch();
      toast.success("All task updates cleared");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (projectLoading || updatesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Project not found</div>
      </div>
    );
  }

  const successCount = results?.filter(r => r.status === 'updated').length || 0;
  const failedCount = results?.filter(r => r.status === 'failed').length || 0;
  const skippedCount = results?.filter(r => r.status === 'skipped').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Update Project Dates</h1>
          <p className="text-muted-foreground">
            {project.companies?.name} - {project.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Task Updates</CardTitle>
          <CardDescription>
            {taskUpdates?.length || 0} task(s) configured for date updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taskUpdates && taskUpdates.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Title</TableHead>
                      <TableHead>Planned Start</TableHead>
                      <TableHead>Planned End</TableHead>
                      <TableHead>Actual Start</TableHead>
                      <TableHead>Actual End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskUpdates.map((update) => (
                      <TableRow key={update.id}>
                        <TableCell className="font-medium">{update.taskTitle}</TableCell>
                        <TableCell>{update.plannedStart || '-'}</TableCell>
                        <TableCell>{update.plannedEnd || '-'}</TableCell>
                        <TableCell>{update.actualStart || '-'}</TableCell>
                        <TableCell>{update.actualEnd || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleApplyUpdates}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Apply All Updates'
                  )}
                </Button>
                <Button 
                  onClick={handleClearUpdates}
                  variant="outline"
                  disabled={isUpdating}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">No task updates configured for this project.</p>
              <p className="text-sm">Contact your administrator to configure task date updates.</p>
            </div>
          )}

          {results && (
            <div className="space-y-4 mt-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold">Update Results</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg border border-green-200 dark:border-green-800">
                  <Badge variant="default" className="mb-2">Success</Badge>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{successCount}</div>
                </div>
                <div className="p-4 bg-background rounded-lg border border-red-200 dark:border-red-800">
                  <Badge variant="destructive" className="mb-2">Failed</Badge>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <Badge variant="secondary" className="mb-2">Skipped</Badge>
                  <div className="text-3xl font-bold text-muted-foreground">{skippedCount}</div>
                </div>
              </div>

              {failedCount > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-destructive mb-2">Failed Tasks:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.filter(r => r.status === 'failed').map((result, index) => (
                      <div key={index} className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20">
                        <strong>{result.taskTitle}:</strong> {result.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
