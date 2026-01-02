import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, X, Download, Upload, FileDown } from 'lucide-react';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { DeleteContactDialog } from '@/components/contacts/DeleteContactDialog';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ImportErrorsDialog } from '@/components/contacts/ImportErrorsDialog';
import { useContacts, Contact } from '@/hooks/useContacts';
import { 
  exportContactsToCsv, 
  generateTemplate, 
  parseCsvFile, 
  importContacts, 
  downloadCsv,
  ImportResult,
} from '@/lib/contactsCsvService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Re-export types for backward compatibility
export type { Contact, ContactEmail } from '@/hooks/useContacts';

export default function Contacts() {
  const { toast } = useToast();
  const {
    contacts,
    filteredContacts,
    loading,
    searchQuery,
    setSearchQuery,
    allRoles,
    allCompanies,
    allProjects,
    refetch,
    hasMore,
    totalCount,
    updateContactLocal,
  } = useContacts();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

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

  const openDeleteDialog = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
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

  // CSV Export/Import functions
  const handleExportCsv = useCallback(() => {
    const dataToExport = searchQuery ? filteredContacts : contacts;
    const csv = exportContactsToCsv(dataToExport);
    const filename = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(csv, filename);
    toast({
      title: "Export Complete",
      description: `${dataToExport.length} contacts exported`,
    });
  }, [contacts, filteredContacts, searchQuery, toast]);

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateTemplate();
    downloadCsv(csv, 'contacts_template.csv');
    toast({
      title: "Template Downloaded",
      description: "Use this template to import contacts",
    });
  }, [toast]);

  const handleImportCsv = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const rows = await parseCsvFile(file);
      
      if (rows.length === 0) {
        toast({
          title: "Empty File",
          description: "The CSV file contains no data rows",
          variant: "destructive",
        });
        return;
      }

      const result = await importContacts(rows, allCompanies, allRoles);
      setImportResult(result);

      if (result.success > 0) {
        await refetch();
      }

      // Show detailed errors in modal if any
      if (result.errors.length > 0) {
        setImportErrorsOpen(true);
      } else {
        toast({
          title: "Import Complete",
          description: `${result.success} contacts imported successfully`,
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
  }, [allCompanies, allRoles, toast, refetch]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleImportCsv}
        className="hidden"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">Manage contacts across all projects</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={importing}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={handleExportCsv} disabled={contacts.length === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Export {searchQuery ? 'Filtered' : 'All'} Contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <FileDown className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Contacts</CardTitle>
              <CardDescription>
                {filteredContacts.length} of {totalCount} contact{totalCount !== 1 ? 's' : ''} 
                {hasMore && <span className="ml-1">(more available)</span>}
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
            <ContactsTable
              contacts={filteredContacts}
              allRoles={allRoles}
              allCompanies={allCompanies}
              allProjects={allProjects}
              onUpdate={updateContactLocal}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onRefetch={refetch}
            />
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

      <ImportErrorsDialog
        open={importErrorsOpen}
        onOpenChange={setImportErrorsOpen}
        result={importResult}
      />
    </div>
  );
}
