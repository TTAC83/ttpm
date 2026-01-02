import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, Mail, Phone, Building2, Edit, Trash2, X } from 'lucide-react';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { DeleteContactDialog } from '@/components/contacts/DeleteContactDialog';

export interface ContactEmail {
  email: string;
  is_primary: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  emails: ContactEmail[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  roles?: { id: string; name: string }[];
  projects?: { id: string; name: string; type: 'implementation' | 'solutions' }[];
}

export default function Contacts() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      // Fetch contacts with their roles and project assignments
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('name');

      if (contactsError) throw contactsError;

      // Fetch role assignments
      const { data: roleAssignments, error: rolesError } = await supabase
        .from('contact_role_assignments')
        .select(`
          contact_id,
          contact_roles_master (id, name)
        `);

      if (rolesError) throw rolesError;

      // Fetch implementation project assignments
      const { data: projectAssignments, error: projectsError } = await supabase
        .from('contact_projects')
        .select(`
          contact_id,
          projects (id, company_id, companies (name))
        `);

      if (projectsError) throw projectsError;

      // Fetch solutions project assignments
      const { data: solutionsAssignments, error: solutionsError } = await supabase
        .from('contact_solutions_projects')
        .select(`
          contact_id,
          solutions_projects (id, company_id, companies (name))
        `);

      if (solutionsError) throw solutionsError;

      // Map roles and projects to contacts
      const enrichedContacts = (contactsData || []).map(contact => {
        const contactRoles = roleAssignments
          ?.filter(ra => ra.contact_id === contact.id)
          .map(ra => ra.contact_roles_master)
          .filter(Boolean) as { id: string; name: string }[] || [];

        const implProjects = projectAssignments
          ?.filter(pa => pa.contact_id === contact.id)
          .map(pa => ({
            id: pa.projects?.id,
            name: pa.projects?.companies?.name || 'Unknown',
            type: 'implementation' as const
          }))
          .filter(p => p.id) || [];

        const solProjects = solutionsAssignments
          ?.filter(sa => sa.contact_id === contact.id)
          .map(sa => ({
            id: sa.solutions_projects?.id,
            name: sa.solutions_projects?.companies?.name || 'Unknown',
            type: 'solutions' as const
          }))
          .filter(p => p.id) || [];

        // Parse emails from JSONB - handle as unknown first
        const rawEmails = contact.emails;
        let parsedEmails: ContactEmail[] = [];
        if (Array.isArray(rawEmails)) {
          parsedEmails = rawEmails as unknown as ContactEmail[];
        }

        return {
          ...contact,
          emails: parsedEmails,
          roles: contactRoles,
          projects: [...implProjects, ...solProjects]
        };
      });

      setContacts(enrichedContacts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.emails.some(e => e.email.toLowerCase().includes(query)) ||
      contact.roles?.some(r => r.name.toLowerCase().includes(query)) ||
      contact.projects?.some(p => p.name.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  const openCreateDialog = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const openDeleteDialog = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingContact(null);
    fetchContacts();
  };

  const handleDeleted = () => {
    setDeleteDialogOpen(false);
    setContactToDelete(null);
    fetchContacts();
  };

  const getPrimaryEmail = (emails: ContactEmail[]) => {
    const primary = emails.find(e => e.is_primary);
    return primary?.email || emails[0]?.email || null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">Manage contacts across all projects</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Contacts</CardTitle>
              <CardDescription>
                {filteredContacts.length} of {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No contacts match your search.' : 'No contacts yet. Click "Add Contact" to create one.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      {getPrimaryEmail(contact.emails) ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{getPrimaryEmail(contact.emails)}</span>
                          {contact.emails.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              +{contact.emails.length - 1}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.company ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{contact.company}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.roles && contact.roles.length > 0 ? (
                          contact.roles.slice(0, 2).map(role => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {contact.roles && contact.roles.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.projects && contact.projects.length > 0 ? (
                          contact.projects.slice(0, 2).map(project => (
                            <Badge 
                              key={project.id} 
                              variant={project.type === 'implementation' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {project.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {contact.projects && contact.projects.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.projects.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(contact)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        onSaved={handleSaved}
      />

      <DeleteContactDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        contact={contactToDelete}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
