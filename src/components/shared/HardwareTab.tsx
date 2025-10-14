import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Factory, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HardwareSelectionDialog } from '../HardwareSelectionDialog';

interface HardwareTabProps {
  projectId: string;
  type: 'project' | 'bau' | 'solutions';
  onUpdate?: () => void;
}

interface HardwareRequirement {
  id: string;
  hardware_master_id: string;
  quantity: number;
  notes?: string;
  hardware_master: {
    id: string;
    sku_no: string;
    product_name: string;
    hardware_type: string;
    price_gbp?: number;
  };
}

export const HardwareTab = ({ projectId, type, onUpdate }: HardwareTabProps) => {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<HardwareRequirement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHardwareType, setSelectedHardwareType] = useState<string>('');

  useEffect(() => {
    fetchRequirements();
  }, [projectId, type]);

  const fetchRequirements = async () => {
    try {
      const columnName = type === 'project' ? 'project_id' : type === 'bau' ? 'bau_customer_id' : 'solutions_project_id';
      
      const { data, error } = await supabase
        .from('project_hardware_requirements')
        .select(`
          id,
          hardware_master_id,
          quantity,
          notes,
          hardware_master:hardware_master_id (
            id,
            sku_no,
            product_name,
            hardware_type,
            price_gbp
          )
        `)
        .eq(columnName, projectId);

      if (error) throw error;
      setRequirements(data as any || []);
    } catch (error) {
      console.error('Error fetching hardware requirements:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware requirements',
        variant: 'destructive',
      });
    }
  };

  const handleAddHardware = (hardwareType: string) => {
    setSelectedHardwareType(hardwareType);
    setDialogOpen(true);
  };

  const handleSaveSelection = async (hardwareId: string, quantity: number) => {
    try {
      const columnName = type === 'project' ? 'project_id' : type === 'bau' ? 'bau_customer_id' : 'solutions_project_id';
      
      const { error } = await supabase
        .from('project_hardware_requirements')
        .upsert({
          [columnName]: projectId,
          hardware_master_id: hardwareId,
          quantity
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Hardware requirement saved successfully',
      });

      setDialogOpen(false);
      fetchRequirements();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving hardware requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to save hardware requirement',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (requirementId: string) => {
    try {
      const { error } = await supabase
        .from('project_hardware_requirements')
        .delete()
        .eq('id', requirementId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Hardware requirement removed',
      });

      fetchRequirements();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing hardware requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove hardware requirement',
        variant: 'destructive',
      });
    }
  };

  const groupedRequirements = requirements.reduce((acc, req) => {
    const type = req.hardware_master.hardware_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(req);
    return acc;
  }, {} as Record<string, HardwareRequirement[]>);

  const HARDWARE_TYPES = ['Server', 'Camera', 'Light', 'PLC', 'Gateway', 'IoT Device', 'IoT Receiver', 'TV Device'];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              <CardTitle>Hardware Requirements</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {requirements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hardware requirements added yet</p>
              <p className="text-sm mt-2">Select hardware types below to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedRequirements).map(([hwType, items]) => (
                <div key={hwType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{hwType}</h4>
                    <Badge variant="secondary">{items.length} item(s)</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{req.hardware_master.product_name}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {req.hardware_master.sku_no} • Qty: {req.quantity}
                            {req.hardware_master.price_gbp && ` • £${(req.hardware_master.price_gbp * req.quantity).toFixed(2)}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(req.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Add Hardware</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {HARDWARE_TYPES.map(hwType => (
                <Button
                  key={hwType}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddHardware(hwType)}
                  className="justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {hwType}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <SimpleHardwareDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          hardwareType={selectedHardwareType}
          onSave={handleSaveSelection}
        />
      )}
    </>
  );
};

// Simple dialog for selecting hardware and quantity
interface SimpleHardwareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hardwareType: string;
  onSave: (hardwareId: string, quantity: number) => void;
}

function SimpleHardwareDialog({ open, onOpenChange, hardwareType, onSave }: SimpleHardwareDialogProps) {
  const { toast } = useToast();
  const [hardware, setHardware] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && hardwareType) {
      fetchHardware();
    }
  }, [open, hardwareType]);

  const fetchHardware = async () => {
    try {
      const { data, error } = await supabase
        .from('hardware_master')
        .select('*')
        .eq('hardware_type', hardwareType)
        .order('product_name');

      if (error) throw error;
      setHardware(data || []);
    } catch (error) {
      console.error('Error fetching hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware options',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!selectedId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a hardware item',
        variant: 'destructive',
      });
      return;
    }
    onSave(selectedId, quantity);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {hardwareType}</DialogTitle>
          <DialogDescription>Select hardware and specify quantity</DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hardware Item</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hardware..." />
                </SelectTrigger>
                <SelectContent>
                  {hardware.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku_no} - {item.product_name}
                      {item.price_gbp && ` (£${item.price_gbp})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
