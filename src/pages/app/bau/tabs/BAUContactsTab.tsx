import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { getBauContacts, BAUContact } from '@/lib/bauService';
import { useToast } from '@/hooks/use-toast';

interface BAUContactsTabProps {
  customerId: string;
}

export const BAUContactsTab = ({ customerId }: BAUContactsTabProps) => {
  const [contacts, setContacts] = useState<BAUContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getBauContacts(customerId);
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{(contact as any).title || '-'}</TableCell>
                    <TableCell>{contact.role || '-'}</TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {contacts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No contacts found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};