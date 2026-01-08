import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, UserPlus } from 'lucide-react';
import { Contact, ContactEmail } from '@/hooks/useContacts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  findContactByEmail, 
  linkContactToCompany, 
  linkContactToProject, 
  linkContactToSolutionsProject 
} from '@/lib/contactMatchingService';
import { EmailInput } from './shared/EmailInput';
import { ContactFormFields } from './shared/ContactFormFields';
import { RoleSelector } from './shared/RoleSelector';

interface ContactRole {
  id: string;
  name: string;
  description: string | null;
}

interface ProjectContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  projectId: string;
  projectType: 'implementation' | 'solutions';
  companyId: string;
  companyName: string;
  onSaved: () => void;
}

export function ProjectContactDialog({ 
  open, 
  onOpenChange, 
  contact, 
  projectId,
  projectType,
  companyId,
  companyName,
  onSaved 
}: ProjectContactDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<ContactRole[]>([]);
  const [matchedContact, setMatchedContact] = useState<{ id: string; name: string } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    phone: '',
    notes: '',
  });
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchRoles();
      setMatchedContact(null);
      if (contact) {
        setFormData({
          name: contact.name,
          title: contact.title || '',
          phone: contact.phone || '',
          notes: contact.notes || '',
        });
        setEmails(contact.emails || []);
        setSelectedRoleIds(new Set(contact.roles?.map(r => r.id) || []));
      } else {
        resetForm();
      }
    }
  }, [open, contact]);

  const resetForm = () => {
    setFormData({ name: '', title: '', phone: '', notes: '' });
    setEmails([]);
    setSelectedRoleIds(new Set());
    setMatchedContact(null);
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_roles_master')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableRoles(data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const checkEmailMatch = async (email: string) => {
    if (!email || contact) return; // Skip for edit mode
    
    setCheckingEmail(true);
    try {
      const match = await findContactByEmail(email);
      if (match) {
        setMatchedContact({ id: match.id, name: match.name });
      } else {
        setMatchedContact(null);
      }
    } catch (error) {
      console.error('Error checking email match:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!matchedContact) return;
    
    try {
      setSaving(true);
      
      // Link to company if not already linked
      await linkContactToCompany(matchedContact.id, companyId);
      
      // Link to project
      if (projectType === 'implementation') {
        await linkContactToProject(matchedContact.id, projectId);
      } else {
        await linkContactToSolutionsProject(matchedContact.id, projectId);
      }

      toast({
        title: "Contact Linked",
        description: `"${matchedContact.name}" has been linked to this project`,
      });

      onSaved();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link contact",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            name: formData.name.trim(),
            title: formData.title.trim() || null,
            phone: formData.phone.trim() || null,
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
            title: formData.title.trim() || null,
            phone: formData.phone.trim() || null,
            company: companyName, // Auto-assign company name
            notes: formData.notes.trim() || null,
            emails: emailsJson as unknown as any,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        contactId = data.id;

        // Link to company
        await linkContactToCompany(contactId, companyId, true);
        
        // Link to project
        if (projectType === 'implementation') {
          await linkContactToProject(contactId, projectId);
        } else {
          await linkContactToSolutionsProject(contactId, projectId);
        }
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

      toast({
        title: contact ? "Contact Updated" : "Contact Created",
        description: `"${formData.name}" has been ${contact ? 'updated' : 'added to this project'}`,
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
          <DialogTitle>{contact ? 'Edit Contact' : 'Add Contact to Project'}</DialogTitle>
          <DialogDescription>
            {contact 
              ? 'Update contact details' 
              : `Add a contact to ${companyName}. If the email matches an existing contact, they will be linked.`}
          </DialogDescription>
        </DialogHeader>

        {/* Show link existing contact option */}
        {matchedContact && !contact && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Found existing contact: <strong>{matchedContact.name}</strong></span>
              <Button size="sm" onClick={handleLinkExisting} disabled={saving}>
                <UserPlus className="h-4 w-4 mr-2" />
                Link to Project
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <ContactFormFields 
              formData={formData} 
              onChange={setFormData}
              disabled={saving}
            />

            <div className="space-y-2">
              <Label>Company</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{companyName}</Badge>
                <span className="text-xs text-muted-foreground">(Auto-assigned from project)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Emails</Label>
              <EmailInput
                emails={emails}
                onChange={setEmails}
                onEmailBlur={!contact ? checkEmailMatch : undefined}
                disabled={saving || checkingEmail}
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
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || (!!matchedContact && !contact)}>
            {saving ? 'Saving...' : contact ? 'Update' : 'Create & Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
