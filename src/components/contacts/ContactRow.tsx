import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';
import { Edit, Trash2, Mail, Phone, Building2, Check, Pencil, Unlink, Archive, ArchiveRestore } from 'lucide-react';
import { Contact, ContactEmail } from '@/hooks/useContacts';
import { EditableField } from '@/hooks/useContactInlineEdit';
import { cn } from '@/lib/utils';

interface MasterRole {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  type: 'implementation' | 'solutions';
}

interface InlineEditState {
  editing: { contactId: string; field: EditableField; value: string } | null;
  saving: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  startEdit: (contact: Contact, field: EditableField) => void;
  updateValue: (value: string) => void;
  saveEdit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  getPrimaryEmail: (emails: ContactEmail[]) => string | null;
}

interface ContactRowProps {
  contact: Contact;
  allRoles: MasterRole[];
  allCompanies: Company[];
  allProjects: Project[];
  inlineEdit: InlineEditState;
  isProjectContext?: boolean;
  // Role editing
  editingRolesContactId: string | null;
  selectedRoleIds: string[];
  savingRoles: boolean;
  onStartRolesEdit: (contact: Contact) => void;
  onRolesChange: (ids: string[]) => void;
  onSaveRoles: () => void;
  onCancelRolesEdit: () => void;
  // Company editing
  editingCompanyContactId: string | null;
  savingCompany: boolean;
  onStartCompanyEdit: (contact: Contact) => void;
  onSelectCompany: (id: string | null) => void;
  onCancelCompanyEdit: () => void;
  // Projects editing (hidden in project context)
  editingProjectsContactId: string | null;
  selectedProjectIds: string[];
  savingProjects: boolean;
  onStartProjectsEdit: (contact: Contact) => void;
  onProjectsChange: (ids: string[]) => void;
  onSaveProjects: () => void;
  onCancelProjectsEdit: () => void;
  // Actions
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onArchive?: (contact: Contact) => void;
}

export function ContactRow({
  contact,
  allRoles,
  allCompanies,
  allProjects,
  inlineEdit,
  isProjectContext = false,
  editingRolesContactId,
  selectedRoleIds,
  savingRoles,
  onStartRolesEdit,
  onRolesChange,
  onSaveRoles,
  onCancelRolesEdit,
  editingCompanyContactId,
  savingCompany,
  onStartCompanyEdit,
  onSelectCompany,
  onCancelCompanyEdit,
  editingProjectsContactId,
  selectedProjectIds,
  savingProjects,
  onStartProjectsEdit,
  onProjectsChange,
  onSaveProjects,
  onCancelProjectsEdit,
  onEdit,
  onDelete,
  onArchive,
}: ContactRowProps) {
  const { editing, saving, inputRef, startEdit, updateValue, saveEdit, handleKeyDown, getPrimaryEmail } = inlineEdit;
  const isArchived = !!contact.archived_at;

  const renderEditableCell = (
    field: EditableField,
    icon: React.ReactNode,
    displayValue: string | null
  ) => {
    const isEditing = editing?.contactId === contact.id && editing?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={editing.value}
            onChange={(e) => updateValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className="h-7 text-sm py-0 px-2"
            disabled={saving}
          />
        </div>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="group flex items-center gap-1.5 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
            onDoubleClick={() => startEdit(contact, field)}
          >
            {displayValue ? (
              <>
                {icon}
                <span className="flex-1">{displayValue}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </>
            ) : (
              <>
                <span className="text-muted-foreground italic">Click to add</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Double-click to edit</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const primaryEmail = getPrimaryEmail(contact.emails);
  const isEditingRoles = editingRolesContactId === contact.id;
  const isEditingCompany = editingCompanyContactId === contact.id;
  const isEditingProjects = editingProjectsContactId === contact.id;

  return (
    <TableRow className={cn(isArchived && "opacity-60 bg-muted/30")}>
      {/* Name */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {renderEditableCell('name', null, contact.name)}
          {isArchived && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <Archive className="h-3 w-3 mr-1" />
              Archived
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Email */}
      <TableCell>
        {renderEditableCell('email', <Mail className="h-3.5 w-3.5 text-muted-foreground" />, primaryEmail)}
        {contact.emails.length > 1 && (
          <Badge variant="outline" className="ml-1 text-xs">
            +{contact.emails.length - 1}
          </Badge>
        )}
      </TableCell>

      {/* Phone */}
      <TableCell>
        {renderEditableCell('phone', <Phone className="h-3.5 w-3.5 text-muted-foreground" />, contact.phone)}
      </TableCell>

      {/* Company */}
      <TableCell>
        {isEditingCompany ? (
          <Popover open={true} onOpenChange={(open) => !open && onCancelCompanyEdit()}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7" disabled={savingCompany}>
                {contact.company || 'Select...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search company..." />
                <CommandList>
                  <CommandEmpty>No company found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => onSelectCompany(null)}>
                      <span className="text-muted-foreground">None</span>
                    </CommandItem>
                    {allCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        onSelect={() => onSelectCompany(company.id)}
                      >
                        {company.name}
                        {company.id === contact.company_id && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="group flex items-center gap-1.5 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                onClick={() => onStartCompanyEdit(contact)}
              >
                {contact.company ? (
                  <>
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{contact.company}</span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground italic">Click to add</span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to edit company</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Roles */}
      <TableCell>
        {isEditingRoles ? (
          <div className="space-y-2">
            <MultiSelectCombobox
              options={allRoles.map((role): MultiSelectOption => ({
                value: role.id,
                label: role.name,
              }))}
              selected={selectedRoleIds}
              onSelectionChange={onRolesChange}
              placeholder="Select roles..."
              searchPlaceholder="Search roles..."
              emptyMessage="No roles found."
              inline
            />
            <div className="flex gap-1">
              <Button size="sm" variant="default" onClick={onSaveRoles} disabled={savingRoles}>
                Done
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelRolesEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="group flex flex-wrap gap-1 cursor-pointer hover:bg-muted/30 rounded p-1 -m-1 transition-colors min-h-[24px]"
                onClick={() => onStartRolesEdit(contact)}
              >
                {contact.roles && contact.roles.length > 0 ? (
                  <>
                    {contact.roles.map(role => (
                      <Badge key={role.id} variant="secondary" className="text-xs">
                        {role.name}
                      </Badge>
                    ))}
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity self-center" />
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground italic text-sm">Click to add</span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to edit roles</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Projects - hidden in project context */}
      {!isProjectContext && (
        <TableCell>
          {isEditingProjects ? (
            <div className="space-y-2">
              <MultiSelectCombobox
                options={allProjects.map((project): MultiSelectOption => ({
                  value: project.id,
                  label: project.name,
                  badge: project.type,
                  badgeVariant: project.type === 'implementation' ? 'default' : 'secondary',
                }))}
                selected={selectedProjectIds}
                onSelectionChange={onProjectsChange}
                placeholder="Select projects..."
                searchPlaceholder="Search projects..."
                emptyMessage="No projects found."
                inline
              />
              <div className="flex gap-1">
                <Button size="sm" variant="default" onClick={onSaveProjects} disabled={savingProjects}>
                  Done
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelProjectsEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="group flex flex-wrap gap-1 cursor-pointer hover:bg-muted/30 rounded p-1 -m-1 transition-colors min-h-[24px]"
                  onClick={() => onStartProjectsEdit(contact)}
                >
                  {contact.projects && contact.projects.length > 0 ? (
                    <>
                      {contact.projects.slice(0, 2).map(project => (
                        <Badge 
                          key={project.id} 
                          variant={project.type === 'implementation' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {project.name}
                        </Badge>
                      ))}
                      {contact.projects.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{contact.projects.length - 2}
                        </Badge>
                      )}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity self-center" />
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground italic text-sm">Click to add</span>
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to edit projects</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TableCell>
      )}

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(contact)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit all details</TooltipContent>
          </Tooltip>
          {onArchive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onArchive(contact)}
                >
                  {isArchived ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isArchived ? 'Restore contact' : 'Archive contact'}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isProjectContext ? 'text-orange-600 hover:text-orange-600' : 'text-destructive hover:text-destructive'}`}
                onClick={() => onDelete(contact)}
              >
                {isProjectContext ? <Unlink className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isProjectContext ? 'Remove from project' : 'Delete contact'}
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
