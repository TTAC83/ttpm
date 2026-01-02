import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Star } from 'lucide-react';
import { Contact, ContactEmail } from '@/pages/app/Contacts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [saving, setSaving] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<ContactRole[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchRolesAndProjects();
      if (contact) {
        setFormData({
          name: contact.name,
          phone: contact.phone || '',
          company: contact.company || '',
          notes: contact.notes || '',
        });
        setEmails(contact.emails || []);
        setSelectedRoleIds(new Set(contact.roles?.map(r => r.id) || []));
        setSelectedProjectIds(new Set(contact.projects?.map(p => p.id) || []));
      } else {
        resetForm();
      }
    }
  }, [open, contact]);

  const resetForm = () => {
    setFormData({ name: '', phone: '', company: '', notes: '' });
    setEmails([]);
    setNewEmail('');
    setSelectedRoleIds(new Set());
    setSelectedProjectIds(new Set());
  };

  const fetchRolesAndProjects = async () => {
    try {
      const [rolesRes, projectsRes, solutionsRes] = await Promise.all([
        supabase.from('contact_roles_master').select('*').order('name'),
        supabase.from('projects').select('id, company_id, companies (name)').order('created_at', { ascending: false }),
        supabase.from('solutions_projects').select('id, company_id, companies (name)').order('created_at', { ascending: false }),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      setAvailableRoles(rolesRes.data || []);

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

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (emails.some(e => e.email.toLowerCase() === trimmed)) {
      toast({
        title: "Duplicate Email",
        description: "This email is already added",
        variant: "destructive",
      });
      return;
    }

    setEmails(prev => [...prev, { email: trimmed, is_primary: prev.length === 0 }]);
    setNewEmail('');
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(prev => {
      const filtered = prev.filter(e => e.email !== emailToRemove);
      // If we removed the primary, make the first one primary
      if (filtered.length > 0 && !filtered.some(e => e.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  const setPrimaryEmail = (email: string) => {
    setEmails(prev => prev.map(e => ({
      ...e,
      is_primary: e.email === email
    })));
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
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

      // Convert emails to JSON-compatible format
      const emailsJson = emails.map(e => ({ email: e.email, is_primary: e.is_primary }));

      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            company: formData.company.trim() || null,
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
            company: formData.company.trim() || null,
            notes: formData.notes.trim() || null,
            emails: emailsJson as unknown as any,
          })
          .select()
          .single();

        if (error) throw error;
        contactId = data.id;
      }

      if (!contactId) throw new Error('Contact ID not available');

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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+44 7700 900000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <Label>Emails</Label>
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                />
                <Button type="button" variant="outline" onClick={addEmail}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {emails.map((email) => (
                    <Badge
                      key={email.email}
                      variant={email.is_primary ? "default" : "secondary"}
                      className="flex items-center gap-1 pr-1"
                    >
                      {email.is_primary && <Star className="h-3 w-3" />}
                      {email.email}
                      {!email.is_primary && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => setPrimaryEmail(email.email)}
                          title="Set as primary"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-transparent"
                        onClick={() => removeEmail(email.email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <div className="space-y-2">
              <Label>Assign Roles</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select one or more roles for this contact
              </p>
              <ScrollArea className="h-[300px] border rounded-md p-3">
                {availableRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No roles available. Create roles in Master Data first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoleIds.has(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`role-${role.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {role.name}
                          </label>
                          {role.description && (
                            <p className="text-xs text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="space-y-2">
              <Label>Assign to Projects</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select projects this contact is associated with
              </p>
              <ScrollArea className="h-[300px] border rounded-md p-3">
                {availableProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No projects available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={selectedProjectIds.has(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          <label
                            htmlFor={`project-${project.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {project.name}
                          </label>
                          <Badge variant={project.type === 'implementation' ? 'default' : 'secondary'} className="text-xs">
                            {project.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
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
