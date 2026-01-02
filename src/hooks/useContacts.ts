import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactEmail {
  email: string;
  is_primary: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  company_id: string | null;
  notes: string | null;
  emails: ContactEmail[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  roles: { id: string; name: string }[];
  projects: { id: string; name: string; type: 'implementation' | 'solutions' }[];
}

interface MasterRole {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  type: 'implementation' | 'solutions';
}

interface UseContactsOptions {
  pageSize?: number;
}

export function useContacts({ pageSize = 50 }: UseContactsOptions = {}) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reference data (cached)
  const [allRoles, setAllRoles] = useState<MasterRole[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [rolesRes, companiesRes, projectsRes, solutionsRes] = await Promise.all([
        supabase.from('contact_roles_master').select('id, name').order('name'),
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('projects').select('id, company_id, companies (name)').order('created_at', { ascending: false }),
        supabase.from('solutions_projects').select('id, company_id, companies (name)').order('created_at', { ascending: false }),
      ]);

      if (rolesRes.data) setAllRoles(rolesRes.data);
      if (companiesRes.data) setAllCompanies(companiesRes.data);

      const implProjects: Project[] = (projectsRes.data || []).map(p => ({
        id: p.id,
        name: p.companies?.name || 'Unknown',
        type: 'implementation' as const
      }));

      const solProjects: Project[] = (solutionsRes.data || []).map(p => ({
        id: p.id,
        name: p.companies?.name || 'Unknown',
        type: 'solutions' as const
      }));

      setAllProjects([...implProjects, ...solProjects]);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  }, []);

  const fetchContacts = useCallback(async (pageNum: number = 0) => {
    try {
      setLoading(true);
      
      // Use the enriched view for single-query fetch
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      // Get total count
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      
      setTotalCount(count || 0);

      // Fetch enriched contacts from view
      const { data, error } = await supabase
        .from('v_contacts_enriched')
        .select('*')
        .order('name')
        .range(from, to);

      if (error) throw error;

      const enrichedContacts: Contact[] = (data || []).map(contact => {
        // Parse emails from JSONB
        let parsedEmails: ContactEmail[] = [];
        if (Array.isArray(contact.emails)) {
          parsedEmails = contact.emails as unknown as ContactEmail[];
        }

        // Parse roles from JSONB
        const roles = (contact.roles || []) as { id: string; name: string }[];

        // Combine implementation and solutions projects
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
          company: contact.company,
          company_id: contact.company_id,
          notes: contact.notes,
          emails: parsedEmails,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
          created_by: contact.created_by,
          roles,
          projects
        };
      });

      if (pageNum === 0) {
        setContacts(enrichedContacts);
      } else {
        setContacts(prev => [...prev, ...enrichedContacts]);
      }

      setHasMore(enrichedContacts.length === pageSize);
      setPage(pageNum);
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
  }, [pageSize, toast]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchContacts(page + 1);
    }
  }, [loading, hasMore, page, fetchContacts]);

  const refetch = useCallback(() => {
    setPage(0);
    fetchContacts(0);
  }, [fetchContacts]);

  // Initial load
  useEffect(() => {
    fetchReferenceData();
    fetchContacts(0);
  }, [fetchReferenceData, fetchContacts]);

  // Filtered contacts (client-side for simplicity, server-side for scale)
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

  // Update a contact in local state
  const updateContactLocal = useCallback((contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, ...updates } : c
    ));
  }, []);

  return {
    contacts,
    filteredContacts,
    loading,
    searchQuery,
    setSearchQuery,
    allRoles,
    allCompanies,
    allProjects,
    refetch,
    loadMore,
    hasMore,
    totalCount,
    page,
    updateContactLocal,
  };
}
