import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContactFilters, ContactSort, ContactSortColumn } from './useContactsFilters';

export interface ContactEmail {
  email: string;
  is_primary: boolean;
}

export interface ContactCompany {
  id: string;
  name: string;
  is_primary: boolean;
}

export interface Contact {
  id: string;
  name: string;
  title: string | null;
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
  companies?: ContactCompany[];
  archived_at: string | null;
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
  filters?: ContactFilters;
  sort?: ContactSort;
}

export function useContacts({ 
  pageSize = 50, 
  filters,
  sort,
}: UseContactsOptions = {}) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reference data (cached)
  const [allRoles, setAllRoles] = useState<MasterRole[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce ref for search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFiltersRef = useRef<string>('');

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

  // Map sort column to database column
  const getSortColumn = (column: ContactSortColumn | null): string => {
    switch (column) {
      case 'name': return 'name';
      case 'title': return 'title';
      case 'email': return 'name'; // Sort by name as fallback (emails are JSONB)
      case 'phone': return 'phone';
      case 'company': return 'company';
      default: return 'name';
    }
  };

  const fetchContacts = useCallback(async (pageNum: number = 0, isNewFilter: boolean = false) => {
    try {
      setLoading(true);
      
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      // Build the base query for count
      let countQuery = supabase
        .from('v_contacts_enriched')
        .select('*', { count: 'exact', head: true });

      // Build the data query
      let dataQuery = supabase
        .from('v_contacts_enriched')
        .select('*');

      // Apply archived filter - by default hide archived contacts
      if (!filters?.showArchived) {
        countQuery = countQuery.is('archived_at', null);
        dataQuery = dataQuery.is('archived_at', null);
      }

      // Apply search filter (searches name, company, phone)
      if (filters?.search?.trim()) {
        const searchTerm = `%${filters.search.trim()}%`;
        const searchFilter = `name.ilike.${searchTerm},company.ilike.${searchTerm},phone.ilike.${searchTerm}`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Apply company filter using company_id
      if (filters?.company && filters.company.length > 0) {
        countQuery = countQuery.in('company_id', filters.company);
        dataQuery = dataQuery.in('company_id', filters.company);
      }

      // Get count
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Apply sorting
      const sortColumn = getSortColumn(sort?.column || null);
      const sortAscending = sort?.direction !== 'desc';
      dataQuery = dataQuery.order(sortColumn, { ascending: sortAscending });

      // Apply pagination
      dataQuery = dataQuery.range(from, to);

      const { data, error } = await dataQuery;

      if (error) throw error;

      // Transform the data
      let enrichedContacts: Contact[] = (data || []).map(contact => {
        let parsedEmails: ContactEmail[] = [];
        if (Array.isArray(contact.emails)) {
          parsedEmails = contact.emails as unknown as ContactEmail[];
        }

        const roles = (contact.roles || []) as { id: string; name: string }[];
        const companies = (contact.companies || []) as unknown as ContactCompany[];
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
          title: (contact as any).title || null,
          phone: contact.phone,
          company: primaryCompany?.name || contact.company || null,
          company_id: primaryCompany?.id || contact.company_id || null,
          notes: contact.notes,
          emails: parsedEmails,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
          created_by: contact.created_by,
          roles,
          projects,
          companies,
          archived_at: (contact as any).archived_at || null,
        };
      });

      // Client-side filtering for roles and projects (JSONB arrays can't be filtered server-side easily)
      if (filters?.roles && filters.roles.length > 0) {
        enrichedContacts = enrichedContacts.filter(contact =>
          contact.roles?.some(r => filters.roles.includes(r.id))
        );
      }

      if (filters?.projects && filters.projects.length > 0) {
        enrichedContacts = enrichedContacts.filter(contact =>
          contact.projects?.some(p => filters.projects.includes(p.id))
        );
      }

      // Client-side sorting for roles and projects columns
      if (sort?.column && sort?.direction) {
        if (sort.column === 'roles') {
          enrichedContacts.sort((a, b) => {
            const aRoles = a.roles?.map(r => r.name).join(', ') || '';
            const bRoles = b.roles?.map(r => r.name).join(', ') || '';
            const comparison = aRoles.localeCompare(bRoles);
            return sort.direction === 'desc' ? -comparison : comparison;
          });
        } else if (sort.column === 'projects') {
          enrichedContacts.sort((a, b) => {
            const comparison = (a.projects?.length || 0) - (b.projects?.length || 0);
            return sort.direction === 'desc' ? -comparison : comparison;
          });
        } else if (sort.column === 'email') {
          enrichedContacts.sort((a, b) => {
            const aEmail = a.emails?.[0]?.email || '';
            const bEmail = b.emails?.[0]?.email || '';
            const comparison = aEmail.localeCompare(bEmail);
            return sort.direction === 'desc' ? -comparison : comparison;
          });
        }
      }

      if (isNewFilter || pageNum === 0) {
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
  }, [pageSize, filters, sort, toast]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchContacts(page + 1, false);
    }
  }, [loading, hasMore, page, fetchContacts]);

  const refetch = useCallback(() => {
    setPage(0);
    fetchContacts(0, true);
  }, [fetchContacts]);

  // Update a contact in local state
  const updateContactLocal = useCallback((contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, ...updates } : c
    ));
  }, []);

  // Initial load of reference data
  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // Debounced fetch when filters/sort change
  useEffect(() => {
    const filtersKey = JSON.stringify({ filters, sort });
    
    // Skip if filters haven't changed
    if (filtersKey === lastFiltersRef.current) return;
    lastFiltersRef.current = filtersKey;

    // Clear any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search, immediate for other filters
    const delay = filters?.search ? 300 : 0;
    
    searchTimeoutRef.current = setTimeout(() => {
      setPage(0);
      fetchContacts(0, true);
    }, delay);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters, sort, fetchContacts]);

  return {
    contacts,
    loading,
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
