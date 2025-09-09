import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateTimeUK } from '@/lib/dateUtils';
import { History, Database } from 'lucide-react';

interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: string;
  field: string;
  old_value: any;
  new_value: any;
  at: string;
  actor: string | null;
  profiles: {
    name: string | null;
  } | null;
}

interface ProjectAuditProps {
  projectId: string;
}

const ProjectAudit = ({ projectId }: ProjectAuditProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.is_internal) {
      fetchAuditLogs();
    }
  }, [projectId, profile]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Note: This is a simplified version. In a real implementation,
      // you'd need to fetch audit logs related to this specific project
      // through project tasks, actions, etc.
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:actor (
            name
          )
        `)
        .order('at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Filter logs related to this project (simplified approach)
      const projectRelatedLogs = (data || []).filter(log => 
        log.entity_type === 'project_task' || 
        log.entity_type === 'action' ||
        log.entity_type === 'line'
      );
      
      setAuditLogs(projectRelatedLogs);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeBadgeVariant = (entityType: string) => {
    switch (entityType) {
      case 'project_task': return 'default';
      case 'action': return 'secondary';
      case 'line': return 'outline';
      default: return 'outline';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (!profile?.is_internal) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Audit logs are only available to internal users</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Audit Trail
        </CardTitle>
        <CardDescription>
          Complete history of changes made to project data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <History className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No audit logs found for this project</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDateTimeUK(log.at)}
                      </TableCell>
                      <TableCell>
                        {log.profiles?.name || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEntityTypeBadgeVariant(log.entity_type)}>
                          {log.entity_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.field}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm text-muted-foreground">
                          {formatValue(log.old_value)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm">
                          {formatValue(log.new_value)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectAudit;