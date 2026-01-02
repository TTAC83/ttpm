# UX Patterns & Guidelines

This document captures preferred UX patterns for consistent implementation across the application.

## Inline Multi-Select Editing

When implementing inline multi-select editing (e.g., editing roles, projects, tags directly in a table cell):

### Preferred Pattern
Use the `MultiSelectCombobox` component with the `inline` prop:

```tsx
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';

// Inside a Popover that opens on double-click:
<Popover open={isEditing} onOpenChange={handleClose}>
  <PopoverTrigger asChild>
    <div onDoubleClick={() => startEdit(item)}>
      {/* Display badges for current selections */}
    </div>
  </PopoverTrigger>
  <PopoverContent className="w-72 p-2" align="start">
    <MultiSelectCombobox
      options={options}
      selected={selectedIds}
      onSelectionChange={handleChange}
      searchPlaceholder="Search..."
      emptyMessage="No items found."
      disabled={saving}
      inline  // <-- This is key!
    />
    <Button size="sm" className="w-full mt-2" onClick={save}>
      Done
    </Button>
  </PopoverContent>
</Popover>
```

### Key Features
1. **`inline` prop**: Shows the search bar and list directly without a nested dropdown button
2. **Selected items sorted to top**: Selected options automatically appear at the top of the list
3. **Search filter**: Built-in search to quickly find items
4. **Single popover**: No nested popovers - the list is immediately visible when opened
5. **Done button**: Explicit save action at the bottom

### Do NOT use
- Nested popovers (popover containing another combobox with its own popover)
- Checkbox lists without search functionality
- Multi-select patterns that require extra clicks to see options

### Component Location
`src/components/ui/multi-select-combobox.tsx`
