import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check, Building2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  linkContactToProject, 
  linkContactToSolutionsProject, 
  linkContactToCompany 
} from '@/lib/contactMatchingService';

interface ExistingContact {
  id: string;
  name: string;
  emails: { email: string; is_primary: boolean }[];
  companies: { id: string; name: string; is_primary: boolean }[];
}

interface LinkExistingContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectType: 'implementation' | 'solutions';
  companyId: string;
  companyName: string;
  existingContactIds: string[];
  onLinked: () => void;
}

export function LinkExistingContactDialog({
  open,
  onOpenChange,
  projectId,
  projectType,
  companyId,
  companyName,
  existingContactIds,
  onLinked,
}: LinkExistingContactDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ExistingContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);

  // Fetch all contacts not already in the project
  useEffect(() => {
    if (!open) return;
    
    async function fetchContacts() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_contacts_enriched')
          .select('id, name, emails, companies')
          .order('name');
        
        if (error) throw error;
        
        // Filter out contacts already in the project
        const available = (data || []).filter(c => !existingContactIds.includes(c.id));
        setContacts(available.map(c => ({
          id: c.id,
          name: c.name,
          emails: (c.emails as any[] || []),
          companies: (c.companies as any[] || []),
        })));
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchContacts();
    setSelectedIds([]);
    setSearch('');
  }, [open, existingContactIds]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.emails.some(e => e.email.toLowerCase().includes(q)) ||
      c.companies.some(co => co.name.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleLink = async () => {
    if (selectedIds.length === 0) return;
    
    setLinking(true);
    try {
      for (const contactId of selectedIds) {
        // Link to project
        if (projectType === 'implementation') {
          await linkContactToProject(contactId, projectId);
        } else {
          await linkContactToSolutionsProject(contactId, projectId);
        }
        
        // Link to company if not already linked
        const contact = contacts.find(c => c.id === contactId);
        const alreadyLinkedToCompany = contact?.companies.some(co => co.id === companyId);
        if (!alreadyLinkedToCompany) {
          await linkContactToCompany(contactId, companyId, false);
        }
      }
      
      toast({
        title: "Contacts Linked",
        description: `${selectedIds.length} contact(s) added to this project`,
      });
      
      onLinked();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link contacts",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  const getPrimaryEmail = (emails: { email: string; is_primary: boolean }[]): string | null => {
    const primary = emails.find(e => e.is_primary);
    return primary?.email || emails[0]?.email || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Link Existing Contacts
          </DialogTitle>
          <DialogDescription>
            Select contacts to add to this project. They will also be linked to {companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? 'No contacts match your search.' : 'No available contacts to link.'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  const email = getPrimaryEmail(contact.emails);
                  const company = contact.companies.find(c => c.is_primary)?.name || contact.companies[0]?.name;
                  
                  return (
                    <div
                      key={contact.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleSelect(contact.id)}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{contact.name}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {email}
                            </span>
                          )}
                          {company && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3" />
                              {company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} contact(s) selected
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={linking || selectedIds.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            {linking ? 'Linking...' : `Link ${selectedIds.length > 0 ? selectedIds.length : ''} Contact${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
