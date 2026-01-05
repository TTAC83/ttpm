import { useState, useMemo, useCallback } from 'react';
import { SortDirection } from '@/components/ui/table-header-filter';

export interface TableFiltersState<T extends string = string> {
  filters: Record<T, string[]>;
  sort: {
    column: T | null;
    direction: SortDirection;
  };
}

export interface UseTableFiltersOptions<T extends string> {
  columns: T[];
}

export function useTableFilters<T extends string>({ columns }: UseTableFiltersOptions<T>) {
  const [state, setState] = useState<TableFiltersState<T>>(() => ({
    filters: columns.reduce((acc, col) => ({ ...acc, [col]: [] }), {} as Record<T, string[]>),
    sort: { column: null, direction: null },
  }));

  const setFilter = useCallback((column: T, values: string[]) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [column]: values },
    }));
  }, []);

  const setSort = useCallback((column: T, direction: SortDirection) => {
    setState(prev => ({
      ...prev,
      sort: { column: direction ? column : null, direction },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: columns.reduce((acc, col) => ({ ...acc, [col]: [] }), {} as Record<T, string[]>),
    }));
  }, [columns]);

  const clearAll = useCallback(() => {
    setState({
      filters: columns.reduce((acc, col) => ({ ...acc, [col]: [] }), {} as Record<T, string[]>),
      sort: { column: null, direction: null },
    });
  }, [columns]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(state.filters).some((values) => (values as string[]).length > 0);
  }, [state.filters]);

  return {
    filters: state.filters,
    sort: state.sort,
    setFilter,
    setSort,
    clearFilters,
    clearAll,
    hasActiveFilters,
  };
}
