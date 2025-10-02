import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Factory } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HardwareTabProps {
  projectId: string;
  type: 'project' | 'bau' | 'solutions';
  onUpdate?: () => void;
}

interface HardwareData {
  servers_required: number;
  gateways_required: number;
  tv_display_devices_required: number;
  receivers_required: number;
  lines_required: number;
}

export const HardwareTab = ({ projectId, type, onUpdate }: HardwareTabProps) => {
  const { toast } = useToast();
  const [hardwareData, setHardwareData] = useState<HardwareData>({
    servers_required: 0,
    gateways_required: 0,
    tv_display_devices_required: 0,
    receivers_required: 0,
    lines_required: 0,
  });

  useEffect(() => {
    fetchHardwareData();
  }, [projectId, type]);

  const fetchHardwareData = async () => {
    try {
      const tableName = type === 'project' ? 'projects' : type === 'bau' ? 'bau_customers' : 'solutions_projects';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('servers_required, gateways_required, tv_display_devices_required, receivers_required, lines_required')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (data) {
        setHardwareData({
          servers_required: data.servers_required || 0,
          gateways_required: data.gateways_required || 0,
          tv_display_devices_required: data.tv_display_devices_required || 0,
          receivers_required: data.receivers_required || 0,
          lines_required: data.lines_required || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching hardware data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware requirements',
        variant: 'destructive',
      });
    }
  };

  const handleHardwareUpdate = async (field: keyof HardwareData, value: number) => {
    try {
      const tableName = type === 'project' ? 'projects' : type === 'bau' ? 'bau_customers' : 'solutions_projects';
      
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: value })
        .eq('id', projectId);

      if (error) throw error;

      setHardwareData(prev => ({ ...prev, [field]: value }));
      
      if (onUpdate) {
        onUpdate();
      }

      toast({
        title: 'Success',
        description: 'Hardware requirement updated successfully',
      });
    } catch (error) {
      console.error('Error updating hardware requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update hardware requirement',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          <CardTitle>Hardware Requirements</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="servers_required">Servers Required</Label>
            <Input
              id="servers_required"
              type="number"
              min="0"
              value={hardwareData.servers_required}
              onChange={(e) => handleHardwareUpdate('servers_required', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gateways_required">Gateways Required</Label>
            <Input
              id="gateways_required"
              type="number"
              min="0"
              value={hardwareData.gateways_required}
              onChange={(e) => handleHardwareUpdate('gateways_required', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tv_display_devices_required">TV Display Devices Required</Label>
            <Input
              id="tv_display_devices_required"
              type="number"
              min="0"
              value={hardwareData.tv_display_devices_required}
              onChange={(e) => handleHardwareUpdate('tv_display_devices_required', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="receivers_required">Receivers Required</Label>
            <Input
              id="receivers_required"
              type="number"
              min="0"
              value={hardwareData.receivers_required}
              onChange={(e) => handleHardwareUpdate('receivers_required', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lines_required">Lines Required</Label>
            <Input
              id="lines_required"
              type="number"
              min="0"
              value={hardwareData.lines_required}
              onChange={(e) => handleHardwareUpdate('lines_required', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
