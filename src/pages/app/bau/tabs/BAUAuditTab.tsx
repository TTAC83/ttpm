import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBauAuditLogs } from '@/lib/bauService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BAUAuditTabProps {
  customerId: string;
}

export const BAUAuditTab = ({ customerId }: BAUAuditTabProps) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await getBauAuditLogs(customerId);
      setAuditLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [customerId]);

  const getActionColor = (field: string) => {
    if (field === 'CREATED') return 'bg-green-500';
    if (field === 'DELETED') return 'bg-red-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({auditLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getActionColor(log.field)} text-white`}>
                          {log.field}
                        </Badge>
                        <span className="text-sm font-medium">{log.entity_type}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      
                      {log.field !== 'CREATED' && log.field !== 'DELETED' && (
                        <div className="text-sm space-y-1">
                          {log.old_value && (
                            <div>
                              <span className="text-muted-foreground">Old: </span>
                              <span className="line-through">{JSON.stringify(log.old_value)}</span>
                            </div>
                          )}
                          {log.new_value && (
                            <div>
                              <span className="text-muted-foreground">New: </span>
                              <span className="font-medium">{JSON.stringify(log.new_value)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {auditLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No audit logs found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};