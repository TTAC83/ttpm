import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Contact, ContactEmail } from './useContacts';

export type EditableField = 'name' | 'title' | 'phone' | 'email';

interface EditingState {
  contactId: string;
  field: EditableField;
  value: string;
}

interface UseContactInlineEditProps {
  contacts: Contact[];
  onUpdate: (contactId: string, updates: Partial<Contact>) => void;
}

export function useContactInlineEdit({ contacts, onUpdate }: UseContactInlineEditProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const getPrimaryEmail = (emails: ContactEmail[]) => {
    const primary = emails.find(e => e.is_primary);
    return primary?.email || emails[0]?.email || null;
  };

  const startEdit = useCallback((contact: Contact, field: EditableField) => {
    let value = '';
    if (field === 'email') {
      value = getPrimaryEmail(contact.emails) || '';
    } else {
      value = contact[field] || '';
    }
    setEditing({ contactId: contact.id, field, value });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const updateValue = useCallback((value: string) => {
    setEditing(prev => prev ? { ...prev, value } : null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;

    const { contactId, field, value } = editing;
    const trimmedValue = value.trim();

    // Validate name is not empty
    if (field === 'name' && !trimmedValue) {
      toast({
        title: "Validation Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (field === 'email' && trimmedValue && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(trimmedValue)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const contact = contacts.find(c => c.id === contactId);
      
      if (field === 'email') {
        // Handle email update - update primary email or add new one
        let updatedEmails: ContactEmail[];
        
        if (!trimmedValue) {
          // Remove primary email - keep others
          updatedEmails = contact?.emails.filter(e => !e.is_primary) || [];
        } else if (contact?.emails.length) {
          // Update existing primary or set first as primary
          const hasPrimary = contact.emails.some(e => e.is_primary);
          if (hasPrimary) {
            updatedEmails = contact.emails.map(e => 
              e.is_primary ? { ...e, email: trimmedValue } : e
            );
          } else {
            updatedEmails = [
              { email: trimmedValue, is_primary: true },
              ...contact.emails.slice(1)
            ];
          }
        } else {
          // No emails yet - create new primary
          updatedEmails = [{ email: trimmedValue, is_primary: true }];
        }

        const { error } = await supabase
          .from('contacts')
          .update({ emails: updatedEmails as unknown as any })
          .eq('id', contactId);

        if (error) throw error;

        onUpdate(contactId, { emails: updatedEmails });
      } else {
        const { error } = await supabase
          .from('contacts')
          .update({ [field]: trimmedValue || null })
          .eq('id', contactId);

        if (error) throw error;

        onUpdate(contactId, { [field]: trimmedValue || null });
      }

      setEditing(null);
      
      toast({
        title: "Saved",
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update ${field}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [editing, contacts, onUpdate, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  return {
    editing,
    saving,
    inputRef,
    startEdit,
    cancelEdit,
    updateValue,
    saveEdit,
    handleKeyDown,
    getPrimaryEmail,
  };
}
