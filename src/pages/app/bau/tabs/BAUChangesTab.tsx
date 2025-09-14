import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBauChangeRequests, BAUChangeRequest } from '@/lib/bauService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BAUChangesTabProps {
  customerId: string;
}

export const BAUChangesTab = ({ customerId }: BAUChangesTabProps) => {
  const [changeRequests, setChangeRequests] = useState<BAUChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadChangeRequests = async () => {
    try {
      setLoading(true);
      const data = await getBauChangeRequests(customerId);
      setChangeRequests(data);
    } catch (error) {
      console.error('Error loading change requests:', error);
      toast({
        title: "Error",
        description: "Failed to load change requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChangeRequests();
  }, [customerId]);

  const getStatusColor = (status: BAUChangeRequest['status']) => {
    switch (status) {
      case 'Proposed': return 'bg-yellow-500';
      case 'Approved': return 'bg-green-500';
      case 'Rejected': return 'bg-red-500';
      case 'Scheduled': return 'bg-blue-500';
      case 'Completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
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
          <CardTitle>Change Requests ({changeRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {changeRequests.map((changeRequest) => (
              <Card key={changeRequest.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{changeRequest.title}</h3>
                        <Badge className={`${getStatusColor(changeRequest.status)} text-white`}>
                          {changeRequest.status}
                        </Badge>
                      </div>
                      
                      {changeRequest.description && (
                        <p className="text-sm text-muted-foreground">{changeRequest.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Created: {format(new Date(changeRequest.created_at), 'MMM d, yyyy')}</span>
                        {changeRequest.target_date && (
                          <span>Target: {format(new Date(changeRequest.target_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {changeRequests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No change requests found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};