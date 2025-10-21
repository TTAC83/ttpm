import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import React from "react";

interface ItemHandlers {
  onUpdate: (index: number, field: string, value: any) => void;
  onDelete: (index: number) => void;
}

interface DynamicListProps<T> {
  items: T[];
  onAdd: () => void;
  onUpdate: (index: number, field: string, value: any) => void;
  onDelete: (index: number) => void;
  renderItem: (item: T, index: number, handlers: ItemHandlers) => React.ReactNode;
  addButtonLabel?: string;
  emptyMessage?: string;
}

export function DynamicList<T>({
  items,
  onAdd,
  onUpdate,
  onDelete,
  renderItem,
  addButtonLabel = "Add Item",
  emptyMessage = "No items added",
}: DynamicListProps<T>) {
  const handlers: ItemHandlers = {
    onUpdate,
    onDelete,
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index}>
              {renderItem(item, index, handlers)}
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-3 w-3 mr-1" />
        {addButtonLabel}
      </Button>
    </div>
  );
}
