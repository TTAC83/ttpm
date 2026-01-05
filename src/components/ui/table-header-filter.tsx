import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface FilterOption {
  value: string;
  label: string;
}

interface TableHeaderFilterProps {
  label: string;
  options?: FilterOption[];
  selectedValues?: string[];
  onFilterChange?: (values: string[]) => void;
  sortDirection?: SortDirection;
  onSortChange?: (direction: SortDirection) => void;
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
}

export function TableHeaderFilter({
  label,
  options = [],
  selectedValues = [],
  onFilterChange,
  sortDirection,
  onSortChange,
  sortable = false,
  filterable = false,
  className,
}: TableHeaderFilterProps) {
  const [open, setOpen] = useState(false);

  const hasActiveFilter = selectedValues.length > 0;

  // Convert to MultiSelectOption format
  const multiSelectOptions: MultiSelectOption[] = options.map(opt => ({
    value: opt.value,
    label: opt.label,
  }));

  const handleSortClick = () => {
    if (!onSortChange) return;
    if (sortDirection === null) {
      onSortChange('asc');
    } else if (sortDirection === 'asc') {
      onSortChange('desc');
    } else {
      onSortChange(null);
    }
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterChange?.([]);
  };

  const SortIcon = sortDirection === 'asc' 
    ? ArrowUp 
    : sortDirection === 'desc' 
      ? ArrowDown 
      : ArrowUpDown;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="font-medium">{label}</span>
      
      {sortable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleSortClick}
        >
          <SortIcon className={cn(
            "h-3.5 w-3.5",
            sortDirection ? "text-primary" : "text-muted-foreground"
          )} />
        </Button>
      )}

      {filterable && options.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 relative",
                hasActiveFilter && "text-primary"
              )}
            >
              <Filter className={cn(
                "h-3.5 w-3.5",
                hasActiveFilter ? "text-primary" : "text-muted-foreground"
              )} />
              {hasActiveFilter && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
                >
                  {selectedValues.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 bg-background" align="start">
            <div className="flex flex-col">
              {hasActiveFilter && (
                <div className="flex justify-end p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={clearFilter}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}
              <MultiSelectCombobox
                inline
                options={multiSelectOptions}
                selected={selectedValues}
                onSelectionChange={(values) => onFilterChange?.(values)}
                searchPlaceholder={`Search ${label.toLowerCase()}...`}
                emptyMessage="No results found."
                className="border-0 rounded-none"
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
