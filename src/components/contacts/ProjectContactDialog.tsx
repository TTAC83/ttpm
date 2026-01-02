import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Star, AlertCircle, UserPlus } from 'lucide-react';
import { Contact, ContactEmail } from '@/hooks/useContacts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';
import { useAuth } from '@/hooks/useAuth';
import { 
  findContactByEmail, 
  linkContactToCompany, 
  linkContactToProject, 
  linkContactToSolutionsProject 
} from '@/lib/contactMatchingService';

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
    phone: '',
    notes: '',
  });
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchRoles();
      setMatchedContact(null);
      if (contact) {
        setFormData({
          name: contact.name,
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
    setFormData({ name: '', phone: '', notes: '' });
    setEmails([]);
    setNewEmail('');
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

    const newEmails = [...emails, { email: trimmed, is_primary: emails.length === 0 }];
    setEmails(newEmails);
    setNewEmail('');
    
    // Check for existing contact when adding first email
    if (newEmails.length === 1 && !contact) {
      checkEmailMatch(trimmed);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(prev => {
      const filtered = prev.filter(e => e.email !== emailToRemove);
      if (filtered.length > 0 && !filtered.some(e => e.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
    setMatchedContact(null);
  };

  const setPrimaryEmail = (email: string) => {
    setEmails(prev => prev.map(e => ({
      ...e,
      is_primary: e.email === email
    })));
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
              <Label>Company</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{companyName}</Badge>
                <span className="text-xs text-muted-foreground">(Auto-assigned from project)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Emails</Label>
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  onBlur={() => newEmail && checkEmailMatch(newEmail)}
                />
                <Button type="button" variant="outline" onClick={addEmail} disabled={checkingEmail}>
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
                  onSelectionChange={(ids) => setSelectedRoleIds(new Set(ids))}
                  placeholder="Search and select roles..."
                  searchPlaceholder="Search roles..."
                  emptyMessage="No roles found."
                />
              )}
            </div>
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
