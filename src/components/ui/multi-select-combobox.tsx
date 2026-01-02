import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  maxDisplayed?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, renders just the search list without button trigger wrapper */
  inline?: boolean;
}

export function MultiSelectCombobox({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  className,
  disabled = false,
  maxDisplayed = 3,
  open: controlledOpen,
  onOpenChange,
  inline = false,
}: MultiSelectComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  };

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selected.filter((v) => v !== value));
  };

  // Sort options: selected first, then unselected, both alphabetically
  const sortedOptions = React.useMemo(() => {
    const selectedSet = new Set(selected);
    return [...options].sort((a, b) => {
      const aSelected = selectedSet.has(a.value);
      const bSelected = selectedSet.has(b.value);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [options, selected]);

  // Inline variant: just the command list without popover wrapper
  if (inline) {
    return (
      <Command className={cn("border rounded-md", className)}>
        <CommandInput placeholder={searchPlaceholder} disabled={disabled} />
        <CommandList className="max-h-[200px]">
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            {sortedOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => !disabled && toggleOption(option.value)}
                  className={cn(disabled && "opacity-50 cursor-not-allowed")}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="flex-1">{option.label}</span>
                  {option.badge && (
                    <Badge
                      variant={option.badgeVariant || "secondary"}
                      className="ml-2 text-xs"
                    >
                      {option.badge}
                    </Badge>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-[36px] h-auto",
            !selected.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selectedOptions.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedOptions.length <= maxDisplayed ? (
              selectedOptions.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={opt.badgeVariant || "secondary"}
                  className="mr-1 mb-0.5 mt-0.5"
                >
                  {opt.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => removeOption(opt.value, e)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <>
                {selectedOptions.slice(0, maxDisplayed).map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={opt.badgeVariant || "secondary"}
                    className="mr-1 mb-0.5 mt-0.5"
                  >
                    {opt.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => removeOption(opt.value, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Badge variant="outline" className="mb-0.5 mt-0.5">
                  +{selectedOptions.length - maxDisplayed} more
                </Badge>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleOption(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="flex-1">{option.label}</span>
                    {option.badge && (
                      <Badge
                        variant={option.badgeVariant || "secondary"}
                        className="ml-2 text-xs"
                      >
                        {option.badge}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
