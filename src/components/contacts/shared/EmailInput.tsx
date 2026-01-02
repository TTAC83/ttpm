import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Star } from 'lucide-react';
import { ContactEmail } from '@/hooks/useContacts';

interface EmailInputProps {
  emails: ContactEmail[];
  onChange: (emails: ContactEmail[]) => void;
  onEmailBlur?: (email: string) => void;
  disabled?: boolean;
}

export function EmailInput({ emails, onChange, onEmailBlur, disabled }: EmailInputProps) {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState('');

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
    onChange(newEmails);
    setNewEmail('');
    
    // Trigger blur callback for email matching on first email
    if (newEmails.length === 1 && onEmailBlur) {
      onEmailBlur(trimmed);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    const filtered = emails.filter(e => e.email !== emailToRemove);
    // If we removed the primary, make the first one primary
    if (filtered.length > 0 && !filtered.some(e => e.is_primary)) {
      filtered[0].is_primary = true;
    }
    onChange(filtered);
  };

  const setPrimaryEmail = (email: string) => {
    onChange(emails.map(e => ({
      ...e,
      is_primary: e.email === email
    })));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@example.com"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
          onBlur={() => newEmail && onEmailBlur?.(newEmail)}
          disabled={disabled}
        />
        <Button type="button" variant="outline" onClick={addEmail} disabled={disabled}>
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
                  disabled={disabled}
                >
                  <Star className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => removeEmail(email.email)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
