import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HardwareItem {
  id: string;
  manufacturer: string;
  model_number: string;
  description?: string;
  price?: number;
}

interface SelectedHardware {
  id: string;
  item: HardwareItem;
  quantity: number;
}

interface HardwareSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tableName: string;
  totalQuantity: number;
  onSave: (selections: SelectedHardware[]) => void;
  existingSelections?: SelectedHardware[];
}

export const HardwareSelectionDialog = ({
  open,
  onOpenChange,
  title,
  tableName,
  totalQuantity,
  onSave,
  existingSelections = []
}: HardwareSelectionDialogProps) => {
  const { toast } = useToast();
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [selections, setSelections] = useState<SelectedHardware[]>(existingSelections);
  const [loading, setLoading] = useState(false);

  const fetchHardware = async () => {
    setLoading(true);
    try {
      let data, error;
      
      switch (tableName) {
        case 'servers_master':
          ({ data, error } = await supabase
            .from('servers_master')
            .select('*')
            .order('manufacturer', { ascending: true }));
          break;
        case 'gateways_master':
          ({ data, error } = await supabase
            .from('gateways_master')
            .select('*')
            .order('manufacturer', { ascending: true }));
          break;
        case 'receivers_master':
          ({ data, error } = await supabase
            .from('receivers_master')
            .select('*')
            .order('manufacturer', { ascending: true }));
          break;
        case 'tv_displays_master':
          ({ data, error } = await supabase
            .from('tv_displays_master')
            .select('*')
            .order('manufacturer', { ascending: true }));
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }

      if (error) throw error;
      setHardware(data || []);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to fetch ${title.toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHardware();
      setSelections(existingSelections);
    }
  }, [open, tableName, existingSelections]);

  const addSelection = () => {
    if (hardware.length === 0) return;
    
    setSelections(prev => [...prev, {
      id: `temp-${Date.now()}`,
      item: hardware[0],
      quantity: 1
    }]);
  };

  const updateSelection = (index: number, field: 'item' | 'quantity', value: HardwareItem | number) => {
    setSelections(prev => prev.map((sel, i) => 
      i === index 
        ? { ...sel, [field]: value }
        : sel
    ));
  };

  const removeSelection = (index: number) => {
    setSelections(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalSelectedQuantity = () => {
    return selections.reduce((total, sel) => total + sel.quantity, 0);
  };

  const canSave = () => {
    return getTotalSelectedQuantity() === totalQuantity && 
           selections.every(sel => sel.item && sel.quantity > 0);
  };

  const handleSave = () => {
    if (canSave()) {
      onSave(selections);
      onOpenChange(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="hardware-selection-description">
        <DialogHeader>
          <DialogTitle>Select {title}</DialogTitle>
        </DialogHeader>
        <div id="hardware-selection-description" className="sr-only">
          Choose the specific hardware models and quantities for your project requirements.
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total required: {totalQuantity} | Selected: {getTotalSelectedQuantity()}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={addSelection}
              disabled={hardware.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Selection
            </Button>
          </div>

          {selections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No selections yet. Click "Add Selection" to start.
            </div>
          )}

          <div className="space-y-3">
            {selections.map((selection, index) => (
              <div key={selection.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-sm">Hardware Model</Label>
                  <Select
                    value={selection.item?.id}
                    onValueChange={(value) => {
                      const item = hardware.find(h => h.id === value);
                      if (item) updateSelection(index, 'item', item);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hardware model" />
                    </SelectTrigger>
                    <SelectContent>
                      {hardware.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {item.manufacturer} - {item.model_number}
                            </span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                            {item.price && (
                              <span className="text-xs text-green-600">
                                £{item.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Label className="text-sm">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={totalQuantity}
                    value={selection.quantity}
                    onChange={(e) => updateSelection(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSelection(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {getTotalSelectedQuantity() !== totalQuantity && selections.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                {getTotalSelectedQuantity() > totalQuantity 
                  ? `Too many selected (${getTotalSelectedQuantity() - totalQuantity} over)`
                  : `Still need ${totalQuantity - getTotalSelectedQuantity()} more`
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave()}>
            Save Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};