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

  // Load existing selections on mount
  useEffect(() => {
    if (solutionsProjectId && value > 0) {
      loadSelections();
    }
  }, [solutionsProjectId, tableName]);

  const getTableNameMapping = () => {
    switch (tableName) {
      case 'servers_master':
        return { 
          table: 'solutions_project_servers', 
          foreignKey: 'server_master_id',
          masterTable: 'servers_master'
        };
      case 'gateways_master':
        return { 
          table: 'solutions_project_gateways', 
          foreignKey: 'gateway_master_id',
          masterTable: 'gateways_master'
        };
      case 'receivers_master':
        return { 
          table: 'solutions_project_receivers', 
          foreignKey: 'receiver_master_id',
          masterTable: 'receivers_master'
        };
      case 'tv_displays_master':
        return { 
          table: 'solutions_project_tv_displays', 
          foreignKey: 'tv_display_master_id',
          masterTable: 'tv_displays_master'
        };
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  };

  const loadSelections = async () => {
    try {
      const mapping = getTableNameMapping();
      
      let data, error;
      switch (mapping.table) {
        case 'solutions_project_servers':
          ({ data, error } = await supabase
            .from('solutions_project_servers')
            .select(`
              id,
              quantity,
              server_master_id,
              servers_master:server_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_gateways':
          ({ data, error } = await supabase
            .from('solutions_project_gateways')
            .select(`
              id,
              quantity,
              gateway_master_id,
              gateways_master:gateway_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_receivers':
          ({ data, error } = await supabase
            .from('solutions_project_receivers')
            .select(`
              id,
              quantity,
              receiver_master_id,
              receivers_master:receiver_master_id (
                id,
                manufacturer,
                model_number,
                description,
                price
              )
            `)
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_tv_displays':
          ({ data, error } = await supabase
            .from('solutions_project_tv_displays')
            .select(`
              id,
              quantity,
              tv_display_master_id,
              tv_displays_master:tv_display_master_id (
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
          throw new Error(`Unknown table: ${mapping.table}`);
      }

      if (error) throw error;

      const loadedSelections: SelectedHardware[] = data?.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        item: item[mapping.masterTable] || item.servers_master || item.gateways_master || item.receivers_master || item.tv_displays_master
      })) || [];

      setSelections(loadedSelections);
    } catch (error) {
      console.error('Error loading selections:', error);
    }
  };

  const saveSelections = async (newSelections: SelectedHardware[]) => {
    try {
      const mapping = getTableNameMapping();
      
      // First, clear existing selections
      let error;
      switch (mapping.table) {
        case 'solutions_project_servers':
          ({ error } = await supabase
            .from('solutions_project_servers')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_gateways':
          ({ error } = await supabase
            .from('solutions_project_gateways')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_receivers':
          ({ error } = await supabase
            .from('solutions_project_receivers')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_tv_displays':
          ({ error } = await supabase
            .from('solutions_project_tv_displays')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
      }

      if (error) throw error;

      // Then insert new selections
      if (newSelections.length > 0) {
        switch (mapping.table) {
          case 'solutions_project_servers':
            ({ error } = await supabase
              .from('solutions_project_servers')
              .insert(newSelections.map(sel => ({
                solutions_project_id: solutionsProjectId,
                server_master_id: sel.item.id,
                quantity: sel.quantity
              }))));
            break;
          case 'solutions_project_gateways':
            ({ error } = await supabase
              .from('solutions_project_gateways')
              .insert(newSelections.map(sel => ({
                solutions_project_id: solutionsProjectId,
                gateway_master_id: sel.item.id,
                quantity: sel.quantity
              }))));
            break;
          case 'solutions_project_receivers':
            ({ error } = await supabase
              .from('solutions_project_receivers')
              .insert(newSelections.map(sel => ({
                solutions_project_id: solutionsProjectId,
                receiver_master_id: sel.item.id,
                quantity: sel.quantity
              }))));
            break;
          case 'solutions_project_tv_displays':
            ({ error } = await supabase
              .from('solutions_project_tv_displays')
              .insert(newSelections.map(sel => ({
                solutions_project_id: solutionsProjectId,
                tv_display_master_id: sel.item.id,
                quantity: sel.quantity
              }))));
            break;
        }

        if (error) throw error;
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

  const clearSelections = async () => {
    try {
      const mapping = getTableNameMapping();
      let error;
      switch (mapping.table) {
        case 'solutions_project_servers':
          ({ error } = await supabase
            .from('solutions_project_servers')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_gateways':
          ({ error } = await supabase
            .from('solutions_project_gateways')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_receivers':
          ({ error } = await supabase
            .from('solutions_project_receivers')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
        case 'solutions_project_tv_displays':
          ({ error } = await supabase
            .from('solutions_project_tv_displays')
            .delete()
            .eq('solutions_project_id', solutionsProjectId));
          break;
      }
      if (error) throw error;
    } catch (error) {
      console.error('Error clearing selections:', error);
    }
  };

  const handleQuantityChange = async (newValue: number) => {
    onChange(newValue);
    if (newValue === 0) {
      setSelections([]);
      // Clear selections from database
      await clearSelections();
    }
  };

  const handleSelectionsChange = async (newSelections: SelectedHardware[]) => {
    setSelections(newSelections);
    onChange(value, newSelections);
    
    // Save selections to database
    await saveSelections(newSelections);
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