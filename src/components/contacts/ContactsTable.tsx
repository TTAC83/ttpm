import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Contact } from '@/hooks/useContacts';
import { ContactRow } from './ContactRow';
import { useContactInlineEdit } from '@/hooks/useContactInlineEdit';

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

interface ContactsTableProps {
  contacts: Contact[];
  allRoles: MasterRole[];
  allCompanies: Company[];
  allProjects: Project[];
  onUpdate: (contactId: string, updates: Partial<Contact>) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onRefetch: () => void;
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
}: ContactsTableProps) {
  const { toast } = useToast();
  const inlineEdit = useContactInlineEdit({ contacts, onUpdate });

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

  // Company editing functions
  const startCompanyEdit = useCallback((contact: Contact) => {
    setEditingCompanyContactId(contact.id);
  }, []);

  const selectCompany = useCallback(async (companyName: string | null) => {
    if (!editingCompanyContactId) return;

    try {
      setSavingCompany(true);
      
      const { error } = await supabase
        .from('contacts')
        .update({ company: companyName })
        .eq('id', editingCompanyContactId);

      if (error) throw error;

      onUpdate(editingCompanyContactId, { company: companyName });

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
  }, [editingCompanyContactId, onUpdate, toast]);

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
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead>Projects</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            allRoles={allRoles}
            allCompanies={allCompanies}
            allProjects={allProjects}
            inlineEdit={inlineEdit}
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
