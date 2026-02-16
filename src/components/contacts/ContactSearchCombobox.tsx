import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

export interface EnrichedContact {
  id: string;
  name: string;
  phone: string | null;
  title: string | null;
  emails: { email: string; is_primary: boolean }[];
  companies: { id: string; name: string; is_primary: boolean }[];
}

interface ContactSearchComboboxProps {
  value: string | null;
  onSelect: (contact: EnrichedContact | null) => void;
  className?: string;
}

export function ContactSearchCombobox({ value, onSelect, className }: ContactSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contacts.length === 0) {
      fetchContacts();
    }
  }, [open]);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_contacts_enriched')
      .select('id, name, phone, title, emails, companies')
      .is('archived_at', null)
      .order('name');

    if (!error && data) {
      setContacts(data.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        title: c.title,
        emails: (c.emails as any[] || []),
        companies: (c.companies as any[] || []),
      })));
    }
    setLoading(false);
  };

  const selectedContact = useMemo(
    () => contacts.find(c => c.id === value),
    [contacts, value]
  );

  const getLabel = (contact: EnrichedContact) => {
    const primaryEmail = contact.emails.find(e => e.is_primary)?.email || contact.emails[0]?.email;
    return primaryEmail ? `${contact.name} (${primaryEmail})` : contact.name;
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedContact ? (
              <span className="truncate">{getLabel(selectedContact)}</span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search existing contacts...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="Type a name or email..." />
            <CommandList>
              <CommandEmpty>{loading ? 'Loading...' : 'No contacts found.'}</CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={`${contact.name} ${contact.emails.map(e => e.email).join(' ')}`}
                    onSelect={() => {
                      onSelect(contact.id === value ? null : contact);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === contact.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{contact.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {contact.emails.map(e => e.email).join(', ')}
                        {contact.companies.length > 0 && ` · ${contact.companies[0].name}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onSelect(null)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
