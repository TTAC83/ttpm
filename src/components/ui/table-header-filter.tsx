import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [searchQuery, setSearchQuery] = useState('');

  const hasActiveFilter = selectedValues.length > 0;

  // Sort options: selected first, then alphabetically
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      const aSelected = selectedValues.includes(a.value);
      const bSelected = selectedValues.includes(b.value);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [options, selectedValues]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return sortedOptions;
    return sortedOptions.filter(opt => 
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedOptions, searchQuery]);

  const toggleOption = (value: string) => {
    if (!onFilterChange) return;
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onFilterChange(newValues);
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterChange?.([]);
  };

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
                "h-6 w-6 p-0",
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
          <PopoverContent className="w-64 p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <CommandInput 
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-0 focus:ring-0"
                />
                {hasActiveFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={clearFilter}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => toggleOption(option.value)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox 
                          checked={isSelected}
                          className="pointer-events-none"
                        />
                        <span className={cn(
                          "flex-1 truncate",
                          isSelected && "font-medium"
                        )}>
                          {option.label}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
