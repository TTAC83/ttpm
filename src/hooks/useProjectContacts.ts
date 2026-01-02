import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Contact, ContactEmail } from './useContacts';

interface MasterRole {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface UseProjectContactsOptions {
  projectId: string;
  projectType: 'implementation' | 'solutions';
  companyId: string;
}

export function useProjectContacts({ projectId, projectType, companyId }: UseProjectContactsOptions) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reference data (cached)
  const [allRoles, setAllRoles] = useState<MasterRole[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [rolesRes, companyRes] = await Promise.all([
        supabase.from('contact_roles_master').select('id, name').order('name'),
        supabase.from('companies').select('id, name').eq('id', companyId).single(),
      ]);

      if (rolesRes.data) setAllRoles(rolesRes.data);
      if (companyRes.data) setCompany(companyRes.data);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  }, [companyId]);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get contact IDs linked to this project
      let contactIds: string[] = [];
      
      if (projectType === 'implementation') {
        const { data } = await supabase
          .from('contact_projects')
          .select('contact_id')
          .eq('project_id', projectId);
        contactIds = (data || []).map(d => d.contact_id);
      } else {
        const { data } = await supabase
          .from('contact_solutions_projects')
          .select('contact_id')
          .eq('solutions_project_id', projectId);
        contactIds = (data || []).map(d => d.contact_id);
      }

      if (contactIds.length === 0) {
        setContacts([]);
        return;
      }

      // Fetch enriched contacts
      const { data, error } = await supabase
        .from('v_contacts_enriched')
        .select('*')
        .in('id', contactIds)
        .order('name');

      if (error) throw error;

      const enrichedContacts: Contact[] = (data || []).map(contact => {
        let parsedEmails: ContactEmail[] = [];
        if (Array.isArray(contact.emails)) {
          parsedEmails = contact.emails as unknown as ContactEmail[];
        }

        const roles = (contact.roles || []) as { id: string; name: string }[];
        const companies = (contact.companies || []) as { id: string; name: string; is_primary: boolean }[];
        
        // Get primary company name for display
        const primaryCompany = companies.find(c => c.is_primary) || companies[0];
        
        const implProjects = (contact.impl_projects || []) as { id: string; name: string; type: string }[];
        const solProjects = (contact.sol_projects || []) as { id: string; name: string; type: string }[];
        const projects = [...implProjects, ...solProjects].map(p => ({
          id: p.id,
          name: p.name,
          type: p.type as 'implementation' | 'solutions'
        }));

        return {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          company: primaryCompany?.name || null,
          company_id: primaryCompany?.id || null,
          notes: contact.notes,
          emails: parsedEmails,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
          created_by: contact.created_by,
          roles,
          projects,
          companies,
        };
      });

      setContacts(enrichedContacts);
    } catch (error: any) {
      console.error('Failed to fetch contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, projectType, toast]);

  const refetch = useCallback(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Initial load
  useEffect(() => {
    fetchReferenceData();
    fetchContacts();
  }, [fetchReferenceData, fetchContacts]);

  // Filtered contacts (client-side search)
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.emails.some(e => e.email.toLowerCase().includes(query)) ||
      contact.roles?.some(r => r.name.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  // Update a contact in local state
  const updateContactLocal = useCallback((contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, ...updates } : c
    ));
  }, []);

  // Remove a contact from local state (for unlink)
  const removeContactLocal = useCallback((contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
  }, []);

  return {
    contacts,
    filteredContacts,
    loading,
    searchQuery,
    setSearchQuery,
    allRoles,
    company,
    refetch,
    updateContactLocal,
    removeContactLocal,
    totalCount: contacts.length,
  };
}
