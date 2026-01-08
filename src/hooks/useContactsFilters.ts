import { useState, useCallback, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type ContactSortColumn = 'name' | 'title' | 'email' | 'phone' | 'company' | 'roles' | 'projects';

export interface ContactFilters {
  search: string;
  roles: string[];
  company: string[];
  projects: string[];
  showArchived: boolean;
}

export interface ContactSort {
  column: ContactSortColumn | null;
  direction: SortDirection;
}

export interface UseContactsFiltersReturn {
  filters: ContactFilters;
  sort: ContactSort;
  setSearch: (value: string) => void;
  setFilter: (key: keyof Omit<ContactFilters, 'search' | 'showArchived'>, values: string[]) => void;
  setSort: (column: ContactSortColumn, direction: SortDirection) => void;
  setShowArchived: (value: boolean) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const initialFilters: ContactFilters = {
  search: '',
  roles: [],
  company: [],
  projects: [],
  showArchived: false,
};

const initialSort: ContactSort = {
  column: null,
  direction: null,
};

export function useContactsFilters(): UseContactsFiltersReturn {
  const [filters, setFilters] = useState<ContactFilters>(initialFilters);
  const [sort, setSort] = useState<ContactSort>(initialSort);

  const setSearch = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const setFilter = useCallback((key: keyof Omit<ContactFilters, 'search' | 'showArchived'>, values: string[]) => {
    setFilters(prev => ({ ...prev, [key]: values }));
  }, []);

  const setSortColumn = useCallback((column: ContactSortColumn, direction: SortDirection) => {
    setSort({ column: direction ? column : null, direction });
  }, []);

  const setShowArchived = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, showArchived: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() !== '' ||
      filters.roles.length > 0 ||
      filters.company.length > 0 ||
      filters.projects.length > 0
    );
  }, [filters]);

  return {
    filters,
    sort,
    setSearch,
    setFilter,
    setSort: setSortColumn,
    setShowArchived,
    clearFilters,
    hasActiveFilters,
  };
}
