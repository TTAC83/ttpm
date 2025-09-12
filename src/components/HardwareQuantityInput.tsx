import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { HardwareSelectionDialog } from './HardwareSelectionDialog';
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

interface HardwareQuantityInputProps {
  label: string;
  value: number;
  onChange: (value: number, selections?: SelectedHardware[]) => void;
  tableName: string;
  id: string;
  solutionsProjectId: string;
}

export const HardwareQuantityInput = ({
  label,
  value,
  onChange,
  tableName,
  id,
  solutionsProjectId
}: HardwareQuantityInputProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selections, setSelections] = useState<SelectedHardware[]>([]);

  // Load existing selections when component mounts
  useEffect(() => {
    if (value > 0) {
      loadExistingSelections();
    } else {
      setSelections([]);
    }
  }, [value, solutionsProjectId, tableName]);

  const loadExistingSelections = async () => {
    try {
      let data, error;
      let masterIdField = '';
      let linkTable = '';

      switch (tableName) {
        case 'servers_master':
          linkTable = 'solutions_project_servers';
          masterIdField = 'server_master_id';
          ({ data, error } = await supabase
            .from('solutions_project_servers')
            .select(`
              id,
              quantity,
              server_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'gateways_master':
          linkTable = 'solutions_project_gateways';
          masterIdField = 'gateway_master_id';
          ({ data, error } = await supabase
            .from('solutions_project_gateways')
            .select(`
              id,
              quantity,
              gateway_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'receivers_master':
          linkTable = 'solutions_project_receivers';
          masterIdField = 'receiver_master_id';
          ({ data, error } = await supabase
            .from('solutions_project_receivers')
            .select(`
              id,
              quantity,
              receiver_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'tv_displays_master':
          linkTable = 'solutions_project_tv_displays';
          masterIdField = 'tv_display_master_id';
          ({ data, error } = await supabase
            .from('solutions_project_tv_displays')
            .select(`
              id,
              quantity,
              tv_display_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        default:
          return;
      }

      if (error) throw error;

      const loadedSelections: SelectedHardware[] = data?.map((item: any) => ({
        id: item.id,
        item: item[masterIdField],
        quantity: item.quantity
      })) || [];

      setSelections(loadedSelections);
    } catch (error) {
      console.error('Error loading existing selections:', error);
    }
  };

  const handleQuantityChange = (newValue: number) => {
    onChange(newValue);
    if (newValue === 0) {
      setSelections([]);
      saveSelections([]);
    }
  };

  const handleSelectionsChange = async (newSelections: SelectedHardware[]) => {
    setSelections(newSelections);
    await saveSelections(newSelections);
    onChange(value, newSelections);
  };

  const saveSelections = async (newSelections: SelectedHardware[]) => {
    try {
      // Delete existing selections for this project and table
      switch (tableName) {
        case 'servers_master':
          const { error: deleteServerError } = await supabase
            .from('solutions_project_servers')
            .delete()
            .eq('solutions_project_id', solutionsProjectId);
          if (deleteServerError) throw deleteServerError;
          
          if (newSelections.length > 0) {
            const insertData = newSelections.map(selection => ({
              solutions_project_id: solutionsProjectId,
              server_master_id: selection.item.id,
              quantity: selection.quantity
            }));
            const { error: insertError } = await supabase
              .from('solutions_project_servers')
              .insert(insertData);
            if (insertError) throw insertError;
          }
          break;
          
        case 'gateways_master':
          const { error: deleteGatewayError } = await supabase
            .from('solutions_project_gateways')
            .delete()
            .eq('solutions_project_id', solutionsProjectId);
          if (deleteGatewayError) throw deleteGatewayError;
          
          if (newSelections.length > 0) {
            const insertData = newSelections.map(selection => ({
              solutions_project_id: solutionsProjectId,
              gateway_master_id: selection.item.id,
              quantity: selection.quantity
            }));
            const { error: insertError } = await supabase
              .from('solutions_project_gateways')
              .insert(insertData);
            if (insertError) throw insertError;
          }
          break;
          
        case 'receivers_master':
          const { error: deleteReceiverError } = await supabase
            .from('solutions_project_receivers')
            .delete()
            .eq('solutions_project_id', solutionsProjectId);
          if (deleteReceiverError) throw deleteReceiverError;
          
          if (newSelections.length > 0) {
            const insertData = newSelections.map(selection => ({
              solutions_project_id: solutionsProjectId,
              receiver_master_id: selection.item.id,
              quantity: selection.quantity
            }));
            const { error: insertError } = await supabase
              .from('solutions_project_receivers')
              .insert(insertData);
            if (insertError) throw insertError;
          }
          break;
          
        case 'tv_displays_master':
          const { error: deleteTvError } = await supabase
            .from('solutions_project_tv_displays')
            .delete()
            .eq('solutions_project_id', solutionsProjectId);
          if (deleteTvError) throw deleteTvError;
          
          if (newSelections.length > 0) {
            const insertData = newSelections.map(selection => ({
              solutions_project_id: solutionsProjectId,
              tv_display_master_id: selection.item.id,
              quantity: selection.quantity
            }));
            const { error: insertError } = await supabase
              .from('solutions_project_tv_displays')
              .insert(insertData);
            if (insertError) throw insertError;
          }
          break;
          
        default:
          return;
      }

      toast({
        title: 'Success',
        description: 'Hardware selections saved successfully',
      });
    } catch (error) {
      console.error('Error saving selections:', error);
      toast({
        title: 'Error',
        description: 'Failed to save hardware selections',
        variant: 'destructive',
      });
    }
  };

  const getTotalSelectedQuantity = () => {
    return selections.reduce((total, sel) => total + sel.quantity, 0);
  };

  const hasValidSelections = () => {
    return value > 0 && getTotalSelectedQuantity() === value;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min="0"
          value={value}
          onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
          className="flex-1"
        />
        {value > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="whitespace-nowrap"
          >
            <Settings className="h-4 w-4 mr-1" />
            Select Models
          </Button>
        )}
      </div>
      
      {value > 0 && selections.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {selections.map((selection, index) => (
              <Badge key={selection.id} variant="secondary" className="text-xs">
                {selection.quantity}x {selection.item.manufacturer} {selection.item.model_number}
              </Badge>
            ))}
          </div>
          {!hasValidSelections() && (
            <p className="text-xs text-yellow-600">
              {getTotalSelectedQuantity() === 0 
                ? 'Click "Select Models" to choose specific hardware'
                : `Selected: ${getTotalSelectedQuantity()}, Required: ${value}`
              }
            </p>
          )}
        </div>
      )}

      <HardwareSelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={label}
        tableName={tableName}
        totalQuantity={value}
        onSave={handleSelectionsChange}
        existingSelections={selections}
      />
    </div>
  );
};