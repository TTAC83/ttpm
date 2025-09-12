import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { HardwareSelectionDialog } from './HardwareSelectionDialog';

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
}

export const HardwareQuantityInput = ({
  label,
  value,
  onChange,
  tableName,
  id
}: HardwareQuantityInputProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selections, setSelections] = useState<SelectedHardware[]>([]);

  const handleQuantityChange = (newValue: number) => {
    onChange(newValue);
    if (newValue === 0) {
      setSelections([]);
    }
  };

  const handleSelectionsChange = (newSelections: SelectedHardware[]) => {
    setSelections(newSelections);
    onChange(value, newSelections);
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