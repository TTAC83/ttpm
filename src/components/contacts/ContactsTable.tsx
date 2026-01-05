import { useCallback, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Contact } from '@/hooks/useContacts';
import { ContactRow } from './ContactRow';
import { useContactInlineEdit } from '@/hooks/useContactInlineEdit';
import { linkContactToCompany } from '@/lib/contactMatchingService';
import { TableHeaderFilter, SortDirection, FilterOption } from '@/components/ui/table-header-filter';
import { useTableFilters } from '@/hooks/useTableFilters';

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

type ContactColumn = 'name' | 'roles' | 'company' | 'projects';

interface ContactsTableProps {
  contacts: Contact[];
  allRoles: MasterRole[];
  allCompanies: Company[];
  allProjects: Project[];
  onUpdate: (contactId: string, updates: Partial<Contact>) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onRefetch: () => void;
  /** When true, shows unlink icon instead of delete and hides Projects column */
  isProjectContext?: boolean;
}

export function ContactsTable({
  contacts,
  allRoles,
  allCompanies,
  allProjects,
  onUpdate,
  onEdit,
  onDelete,
  onRefetch,
  isProjectContext = false,
}: ContactsTableProps) {
  const { toast } = useToast();
  const inlineEdit = useContactInlineEdit({ contacts, onUpdate });

  // Table filtering and sorting
  const { filters, sort, setFilter, setSort } = useTableFilters<ContactColumn>({
    columns: ['name', 'roles', 'company', 'projects'],
  });

  // Build filter options from data
  const roleOptions: FilterOption[] = useMemo(() => 
    allRoles.map(r => ({ value: r.id, label: r.name })),
    [allRoles]
  );

  const companyOptions: FilterOption[] = useMemo(() => 
    allCompanies.map(c => ({ value: c.id, label: c.name })),
    [allCompanies]
  );

  const projectOptions: FilterOption[] = useMemo(() => 
    allProjects.map(p => ({ value: p.id, label: `${p.name} (${p.type})` })),
    [allProjects]
  );

  // Apply filters and sorting to contacts
  const filteredAndSortedContacts = useMemo(() => {
    let result = [...contacts];

    // Apply role filter
    if (filters.roles.length > 0) {
      result = result.filter(contact =>
        contact.roles?.some(r => filters.roles.includes(r.id))
      );
    }

    // Apply company filter
    if (filters.company.length > 0) {
      result = result.filter(contact =>
        contact.company_id && filters.company.includes(contact.company_id)
      );
    }

    // Apply projects filter
    if (filters.projects.length > 0) {
      result = result.filter(contact =>
        contact.projects?.some(p => filters.projects.includes(p.id))
      );
    }

    // Apply sorting
    if (sort.column && sort.direction) {
      result.sort((a, b) => {
        let comparison = 0;
        switch (sort.column) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'company':
            comparison = (a.company || '').localeCompare(b.company || '');
            break;
          case 'roles':
            const aRoles = a.roles?.map(r => r.name).join(', ') || '';
            const bRoles = b.roles?.map(r => r.name).join(', ') || '';
            comparison = aRoles.localeCompare(bRoles);
            break;
          case 'projects':
            const aProjects = a.projects?.length || 0;
            const bProjects = b.projects?.length || 0;
            comparison = aProjects - bProjects;
            break;
        }
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [contacts, filters, sort]);

  // Role editing state
  const [editingRolesContactId, setEditingRolesContactId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // Company editing state
  const [editingCompanyContactId, setEditingCompanyContactId] = useState<string | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  // Projects editing state
  const [editingProjectsContactId, setEditingProjectsContactId] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [savingProjects, setSavingProjects] = useState(false);

  // Role editing functions
  const startRolesEdit = useCallback((contact: Contact) => {
    setEditingRolesContactId(contact.id);
    setSelectedRoleIds(contact.roles?.map(r => r.id) || []);
  }, []);

  const handleRolesChange = useCallback((newRoleIds: string[]) => {
    setSelectedRoleIds(newRoleIds);
  }, []);

  const saveRoles = useCallback(async () => {
    if (!editingRolesContactId) return;

    try {
      setSavingRoles(true);
      
      await supabase
        .from('contact_role_assignments')
        .delete()
        .eq('contact_id', editingRolesContactId);

      if (selectedRoleIds.length > 0) {
        const { error: insertError } = await supabase
          .from('contact_role_assignments')
          .insert(
            selectedRoleIds.map(roleId => ({
              contact_id: editingRolesContactId,
              role_id: roleId
            }))
          );

        if (insertError) throw insertError;
      }

      const newRoles = allRoles.filter(r => selectedRoleIds.includes(r.id));
      onUpdate(editingRolesContactId, { roles: newRoles });

      setEditingRolesContactId(null);
      
      toast({
        title: "Saved",
        description: "Roles updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update roles",
        variant: "destructive",
      });
    } finally {
      setSavingRoles(false);
    }
  }, [editingRolesContactId, selectedRoleIds, allRoles, onUpdate, toast]);

  // Company editing functions - now uses junction table
  const startCompanyEdit = useCallback((contact: Contact) => {
    setEditingCompanyContactId(contact.id);
  }, []);

  const selectCompany = useCallback(async (companyId: string | null) => {
    if (!editingCompanyContactId) return;

    try {
      setSavingCompany(true);
      
      const selectedCompany = allCompanies.find(c => c.id === companyId);
      
      // Update the contacts table for backward compatibility
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ 
          company: selectedCompany?.name || null,
          company_id: companyId 
        })
        .eq('id', editingCompanyContactId);

      if (contactError) throw contactError;

      // Update the contact_companies junction table
      // First, remove existing primary company link
      await supabase
        .from('contact_companies')
        .delete()
        .eq('contact_id', editingCompanyContactId)
        .eq('is_primary', true);

      // Add new primary company link if a company is selected
      if (companyId) {
        await linkContactToCompany(editingCompanyContactId, companyId, true);
      }

      onUpdate(editingCompanyContactId, { 
        company: selectedCompany?.name || null,
        company_id: companyId,
        companies: companyId && selectedCompany 
          ? [{ id: companyId, name: selectedCompany.name, is_primary: true }]
          : []
      });

      setEditingCompanyContactId(null);
      
      toast({
        title: "Saved",
        description: "Company updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
    } finally {
      setSavingCompany(false);
    }
  }, [editingCompanyContactId, allCompanies, onUpdate, toast]);

  // Projects editing functions
  const startProjectsEdit = useCallback((contact: Contact) => {
    setEditingProjectsContactId(contact.id);
    setSelectedProjectIds(contact.projects?.map(p => p.id) || []);
  }, []);

  const handleProjectsChange = useCallback((newProjectIds: string[]) => {
    setSelectedProjectIds(newProjectIds);
  }, []);

  const saveProjects = useCallback(async () => {
    if (!editingProjectsContactId) return;

    try {
      setSavingProjects(true);
      
      await supabase.from('contact_projects').delete().eq('contact_id', editingProjectsContactId);
      await supabase.from('contact_solutions_projects').delete().eq('contact_id', editingProjectsContactId);

      const implProjectIds = allProjects
        .filter(p => p.type === 'implementation' && selectedProjectIds.includes(p.id))
        .map(p => p.id);
      
      const solProjectIds = allProjects
        .filter(p => p.type === 'solutions' && selectedProjectIds.includes(p.id))
        .map(p => p.id);

      if (implProjectIds.length > 0) {
        const { error } = await supabase
          .from('contact_projects')
          .insert(implProjectIds.map(pid => ({ contact_id: editingProjectsContactId, project_id: pid })));
        if (error) throw error;
      }

      if (solProjectIds.length > 0) {
        const { error } = await supabase
          .from('contact_solutions_projects')
          .insert(solProjectIds.map(pid => ({ contact_id: editingProjectsContactId, solutions_project_id: pid })));
        if (error) throw error;
      }

      const newProjects = allProjects.filter(p => selectedProjectIds.includes(p.id));
      onUpdate(editingProjectsContactId, { projects: newProjects });

      setEditingProjectsContactId(null);
      
      toast({
        title: "Saved",
        description: "Projects updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update projects",
        variant: "destructive",
      });
    } finally {
      setSavingProjects(false);
    }
  }, [editingProjectsContactId, selectedProjectIds, allProjects, onUpdate, toast]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <TableHeaderFilter
              label="Name"
              sortable
              sortDirection={sort.column === 'name' ? sort.direction : null}
              onSortChange={(dir) => setSort('name', dir)}
            />
          </TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>
            <TableHeaderFilter
              label="Company"
              sortable
              filterable
              options={companyOptions}
              selectedValues={filters.company}
              onFilterChange={(values) => setFilter('company', values)}
              sortDirection={sort.column === 'company' ? sort.direction : null}
              onSortChange={(dir) => setSort('company', dir)}
            />
          </TableHead>
          <TableHead>
            <TableHeaderFilter
              label="Roles"
              sortable
              filterable
              options={roleOptions}
              selectedValues={filters.roles}
              onFilterChange={(values) => setFilter('roles', values)}
              sortDirection={sort.column === 'roles' ? sort.direction : null}
              onSortChange={(dir) => setSort('roles', dir)}
            />
          </TableHead>
          {!isProjectContext && (
            <TableHead>
              <TableHeaderFilter
                label="Projects"
                sortable
                filterable
                options={projectOptions}
                selectedValues={filters.projects}
                onFilterChange={(values) => setFilter('projects', values)}
                sortDirection={sort.column === 'projects' ? sort.direction : null}
                onSortChange={(dir) => setSort('projects', dir)}
              />
            </TableHead>
          )}
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAndSortedContacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            allRoles={allRoles}
            allCompanies={allCompanies}
            allProjects={allProjects}
            inlineEdit={inlineEdit}
            isProjectContext={isProjectContext}
            // Role editing
            editingRolesContactId={editingRolesContactId}
            selectedRoleIds={selectedRoleIds}
            savingRoles={savingRoles}
            onStartRolesEdit={startRolesEdit}
            onRolesChange={handleRolesChange}
            onSaveRoles={saveRoles}
            onCancelRolesEdit={() => setEditingRolesContactId(null)}
            // Company editing
            editingCompanyContactId={editingCompanyContactId}
            savingCompany={savingCompany}
            onStartCompanyEdit={startCompanyEdit}
            onSelectCompany={selectCompany}
            onCancelCompanyEdit={() => setEditingCompanyContactId(null)}
            // Projects editing
            editingProjectsContactId={editingProjectsContactId}
            selectedProjectIds={selectedProjectIds}
            savingProjects={savingProjects}
            onStartProjectsEdit={startProjectsEdit}
            onProjectsChange={handleProjectsChange}
            onSaveProjects={saveProjects}
            onCancelProjectsEdit={() => setEditingProjectsContactId(null)}
            // Actions
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}
