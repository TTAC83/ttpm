import { Label } from '@/components/ui/label';
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';

interface Role {
  id: string;
  name: string;
  description?: string | null;
}

interface RoleSelectorProps {
  availableRoles: Role[];
  selectedRoleIds: Set<string>;
  onChange: (roleIds: Set<string>) => void;
  disabled?: boolean;
}

export function RoleSelector({ availableRoles, selectedRoleIds, onChange, disabled }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Assign Roles</Label>
      <p className="text-sm text-muted-foreground mb-3">
        Select one or more roles for this contact
      </p>
      {availableRoles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
          No roles available. Create roles in Master Data first.
        </p>
      ) : (
        <MultiSelectCombobox
          options={availableRoles.map((role): MultiSelectOption => ({
            value: role.id,
            label: role.name,
          }))}
          selected={Array.from(selectedRoleIds)}
          onSelectionChange={(ids) => onChange(new Set(ids))}
          placeholder="Search and select roles..."
          searchPlaceholder="Search roles..."
          emptyMessage="No roles found."
        />
      )}
      {selectedRoleIds.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedRoleIds.size} role{selectedRoleIds.size !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
