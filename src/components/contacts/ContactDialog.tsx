import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Contact, ContactEmail } from '@/hooks/useContacts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';
import { useAuth } from '@/hooks/useAuth';
import { EmailInput } from './shared/EmailInput';
import { ContactFormFields } from './shared/ContactFormFields';
import { RoleSelector } from './shared/RoleSelector';
import { linkContactToCompany } from '@/lib/contactMatchingService';

interface Company {
  id: string;
  name: string;
}

interface ContactRole {
  id: string;
  name: string;
  description: string | null;
}

interface Project {
  id: string;
  name: string;
  type: 'implementation' | 'solutions';
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSaved: () => void;
}

export function ContactDialog({ open, onOpenChange, contact, onSaved }: ContactDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<ContactRole[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchRolesAndProjects();
      if (contact) {
        setFormData({
          name: contact.name,
          phone: contact.phone || '',
          notes: contact.notes || '',
        });
        setEmails(contact.emails || []);
        setSelectedRoleIds(new Set(contact.roles?.map(r => r.id) || []));
        setSelectedProjectIds(new Set(contact.projects?.map(p => p.id) || []));
        // Set primary company from companies array or fall back to company_id
        const primaryCompany = contact.companies?.find(c => c.is_primary) || contact.companies?.[0];
        setSelectedCompanyId(primaryCompany?.id || contact.company_id || null);
      } else {
        resetForm();
      }
    }
  }, [open, contact]);

  const resetForm = () => {
    setFormData({ name: '', phone: '', notes: '' });
    setEmails([]);
    setSelectedRoleIds(new Set());
    setSelectedProjectIds(new Set());
    setSelectedCompanyId(null);
  };

  const fetchRolesAndProjects = async () => {
    try {
      const [rolesRes, projectsRes, solutionsRes, companiesRes] = await Promise.all([
        supabase.from('contact_roles_master').select('*').order('name'),
        supabase.from('projects').select('id, company_id, companies (name)').order('created_at', { ascending: false }),
        supabase.from('solutions_projects').select('id, company_id, companies (name)').order('created_at', { ascending: false }),
        supabase.from('companies').select('id, name').order('name'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      setAvailableRoles(rolesRes.data || []);

      if (companiesRes.error) throw companiesRes.error;
      setAvailableCompanies(companiesRes.data || []);

      const implProjects: Project[] = (projectsRes.data || []).map(p => ({
        id: p.id,
        name: p.companies?.name || 'Unknown',
        type: 'implementation' as const
      }));

      const solProjects: Project[] = (solutionsRes.data || []).map(p => ({
        id: p.id,
        name: p.companies?.name || 'Unknown',
        type: 'solutions' as const
      }));

      setAvailableProjects([...implProjects, ...solProjects]);
    } catch (error) {
      console.error('Failed to fetch roles/projects:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Contact name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      let contactId = contact?.id;
      const emailsJson = emails.map(e => ({ email: e.email, is_primary: e.is_primary }));
      const selectedCompany = availableCompanies.find(c => c.id === selectedCompanyId);

      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            company: selectedCompany?.name || null,
            company_id: selectedCompanyId,
            notes: formData.notes.trim() || null,
            emails: emailsJson as unknown as any,
          })
          .eq('id', contact.id);

        if (error) throw error;
      } else {
        // Create new contact
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            company: selectedCompany?.name || null,
            company_id: selectedCompanyId,
            notes: formData.notes.trim() || null,
            emails: emailsJson as unknown as any,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        contactId = data.id;
      }

      if (!contactId) throw new Error('Contact ID not available');

      // Sync company in contact_companies junction table
      if (selectedCompanyId) {
        // First remove existing primary company links for this contact
        await supabase
          .from('contact_companies')
          .delete()
          .eq('contact_id', contactId)
          .eq('is_primary', true);
        
        // Add the new primary company link
        await linkContactToCompany(contactId, selectedCompanyId, true);
      }

      // Sync role assignments
      await supabase.from('contact_role_assignments').delete().eq('contact_id', contactId);
      if (selectedRoleIds.size > 0) {
        const roleInserts = Array.from(selectedRoleIds).map(roleId => ({
          contact_id: contactId,
          role_id: roleId,
        }));
        const { error: rolesError } = await supabase
          .from('contact_role_assignments')
          .insert(roleInserts);
        if (rolesError) throw rolesError;
      }

      // Sync project assignments
      await supabase.from('contact_projects').delete().eq('contact_id', contactId);
      await supabase.from('contact_solutions_projects').delete().eq('contact_id', contactId);

      const implProjectIds = availableProjects
        .filter(p => p.type === 'implementation' && selectedProjectIds.has(p.id))
        .map(p => p.id);
      
      const solProjectIds = availableProjects
        .filter(p => p.type === 'solutions' && selectedProjectIds.has(p.id))
        .map(p => p.id);

      if (implProjectIds.length > 0) {
        const { error } = await supabase
          .from('contact_projects')
          .insert(implProjectIds.map(pid => ({ contact_id: contactId, project_id: pid })));
        if (error) throw error;
      }

      if (solProjectIds.length > 0) {
        const { error } = await supabase
          .from('contact_solutions_projects')
          .insert(solProjectIds.map(pid => ({ contact_id: contactId, solutions_project_id: pid })));
        if (error) throw error;
      }

      toast({
        title: contact ? "Contact Updated" : "Contact Created",
        description: `"${formData.name}" has been saved`,
      });

      onSaved();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {contact ? 'Update contact details and assignments' : 'Create a new contact with roles and project assignments'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <ContactFormFields 
              formData={formData} 
              onChange={setFormData}
              disabled={saving}
            />

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Combobox
                options={availableCompanies.map(c => ({ value: c.id, label: c.name }))}
                value={selectedCompanyId || ''}
                onValueChange={(value) => setSelectedCompanyId(value || null)}
                placeholder="Select company..."
                searchPlaceholder="Search companies..."
                emptyMessage="No company found."
              />
            </div>

            <div className="space-y-2">
              <Label>Emails</Label>
              <EmailInput
                emails={emails}
                onChange={setEmails}
                disabled={saving}
              />
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <RoleSelector
              availableRoles={availableRoles}
              selectedRoleIds={selectedRoleIds}
              onChange={setSelectedRoleIds}
              disabled={saving}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="space-y-2">
              <Label>Assign to Projects</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select projects this contact is associated with
              </p>
              {availableProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                  No projects available.
                </p>
              ) : (
                <MultiSelectCombobox
                  options={availableProjects.map((project): MultiSelectOption => ({
                    value: project.id,
                    label: project.name,
                    badge: project.type,
                    badgeVariant: project.type === 'implementation' ? 'default' : 'secondary',
                  }))}
                  selected={Array.from(selectedProjectIds)}
                  onSelectionChange={(ids) => setSelectedProjectIds(new Set(ids))}
                  placeholder="Search and select projects..."
                  searchPlaceholder="Search projects..."
                  emptyMessage="No projects found."
                />
              )}
              {selectedProjectIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedProjectIds.size} project{selectedProjectIds.size !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : contact ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
