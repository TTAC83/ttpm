import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Download, Upload, FileDown, Unlink, UserPlus } from 'lucide-react';
import { ProjectContactDialog } from '@/components/contacts/ProjectContactDialog';
import { DeleteContactDialog } from '@/components/contacts/DeleteContactDialog';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ImportErrorsDialog } from '@/components/contacts/ImportErrorsDialog';
import { LinkExistingContactDialog } from '@/components/contacts/LinkExistingContactDialog';
import { SearchBar } from '@/components/shared/SearchBar';
import { useProjectContacts } from '@/hooks/useProjectContacts';
import { Contact } from '@/hooks/useContacts';
import { 
  exportContactsToCsv, 
  downloadCsv,
} from '@/lib/contactsCsvService';
import { importProjectContacts, ImportResult } from '@/lib/projectContactsCsvService';
import { unlinkContactFromProject, unlinkContactFromSolutionsProject } from '@/lib/contactMatchingService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectContactsProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
  companyId: string;
  companyName: string;
}

export function ProjectContacts({ projectId, projectType, companyId, companyName }: ProjectContactsProps) {
  const { toast } = useToast();
  const {
    contacts,
    filteredContacts,
    loading,
    searchQuery,
    setSearchQuery,
    allRoles,
    refetch,
    totalCount,
    updateContactLocal,
    removeContactLocal,
  } = useProjectContacts({ projectId, projectType, companyId });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [linkExistingOpen, setLinkExistingOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [contactToUnlink, setContactToUnlink] = useState<Contact | null>(null);

  // CSV import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importErrorsOpen, setImportErrorsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreateDialog = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const openUnlinkDialog = (contact: Contact) => {
    setContactToUnlink(contact);
    setUnlinkDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingContact(null);
    refetch();
  };

  const handleDeleted = () => {
    setDeleteDialogOpen(false);
    setContactToDelete(null);
    refetch();
  };

  const handleUnlink = async () => {
    if (!contactToUnlink) return;
    
    try {
      let success: boolean;
      if (projectType === 'implementation') {
        success = await unlinkContactFromProject(contactToUnlink.id, projectId);
      } else {
        success = await unlinkContactFromSolutionsProject(contactToUnlink.id, projectId);
      }

      if (success) {
        removeContactLocal(contactToUnlink.id);
        toast({
          title: "Contact Unlinked",
          description: `"${contactToUnlink.name}" has been removed from this project`,
        });
      } else {
        throw new Error('Failed to unlink contact');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink contact",
        variant: "destructive",
      });
    } finally {
      setUnlinkDialogOpen(false);
      setContactToUnlink(null);
    }
  };

  // CSV Export/Import functions
  const handleExportCsv = useCallback(() => {
    const dataToExport = searchQuery ? filteredContacts : contacts;
    const csv = exportContactsToCsv(dataToExport);
    const filename = `project_contacts_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(csv, filename);
    toast({
      title: "Export Complete",
      description: `${dataToExport.length} contacts exported`,
    });
  }, [contacts, filteredContacts, searchQuery, toast]);

  const handleDownloadTemplate = useCallback(() => {
    // Generate simplified template without company/project columns
    const headers = ['name', 'title', 'phone', 'primary_email', 'additional_emails', 'roles', 'notes'];
    const exampleRow = [
      'John Doe',
      'Operations Manager',
      '+44 7700 900000',
      'john@example.com',
      'john.personal@example.com',
      'Project Lead;Technical Contact',
      'Key stakeholder'
    ];
    const csv = [headers, exampleRow].map(row => 
      row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    downloadCsv(csv, 'project_contacts_template.csv');
    toast({
      title: "Template Downloaded",
      description: "Use this template to import contacts to this project",
    });
  }, [toast]);

  const handleImportCsv = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      
      const result = await importProjectContacts(
        file, 
        projectId, 
        projectType, 
        companyId, 
        companyName,
        allRoles
      );
      setImportResult(result);

      if (result.success > 0 || result.linked > 0) {
        await refetch();
      }

      if (result.errors.length > 0) {
        setImportErrorsOpen(true);
      } else {
        toast({
          title: "Import Complete",
          description: `${result.success} created, ${result.linked} linked to project`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [projectId, projectType, companyId, companyName, allRoles, toast, refetch]);

  // Provide single company for the table
  const allCompanies = [{ id: companyId, name: companyName }];
  // Projects list just for display - this project
  const allProjects = [{ id: projectId, name: companyName, type: projectType }];

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleImportCsv}
        className="hidden"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Project Contacts</CardTitle>
                <CardDescription>
                  {totalCount} contact{totalCount !== 1 ? 's' : ''} linked to this project
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={importing}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background">
                  <DropdownMenuItem onClick={handleExportCsv} disabled={contacts.length === 0}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Contacts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadTemplate}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLinkExistingOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Link Existing
              </Button>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search contacts..."
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No contacts match your search.' : 'No contacts linked to this project yet.'}
            </div>
          ) : (
            <ContactsTable
              contacts={filteredContacts}
              allRoles={allRoles}
              allCompanies={allCompanies}
              allProjects={allProjects}
              onUpdate={updateContactLocal}
              onEdit={openEditDialog}
              onDelete={openUnlinkDialog}
              onRefetch={refetch}
              isProjectContext={true}
            />
          )}
        </CardContent>
      </Card>

      <ProjectContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        projectId={projectId}
        projectType={projectType}
        companyId={companyId}
        companyName={companyName}
        onSaved={handleSaved}
      />

      {/* Unlink confirmation dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact from Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{contactToUnlink?.name}" from this project. 
              The contact will still exist in the system and can be re-added later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>
              <Unlink className="h-4 w-4 mr-2" />
              Remove from Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkExistingContactDialog
        open={linkExistingOpen}
        onOpenChange={setLinkExistingOpen}
        projectId={projectId}
        projectType={projectType}
        companyId={companyId}
        companyName={companyName}
        existingContactIds={contacts.map(c => c.id)}
        onLinked={refetch}
      />

      <ImportErrorsDialog
        open={importErrorsOpen}
        onOpenChange={setImportErrorsOpen}
        result={importResult}
      />
    </div>
  );
}
