import { useEffect, useState } from 'react';

const STORAGE_KEY = 'court-vision.library-filters';

export interface LibraryFiltersState {
  role_lens: string;
  difficulty: string;
  format: string;
  tag: string;
  search: string;
}

const DEFAULT_FILTERS: LibraryFiltersState = {
  role_lens: '',
  difficulty: '',
  format: '',
  tag: '',
  search: '',
};

export function useLibraryFilters() {
  const [filters, setFilters] = useState<LibraryFiltersState>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;

    try {
      return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<LibraryFiltersState>) };
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  return {
    filters,
    setFilter: <K extends keyof LibraryFiltersState>(key: K, value: LibraryFiltersState[K]) =>
      setFilters((current) => ({ ...current, [key]: value })),
    resetFilters: () => setFilters(DEFAULT_FILTERS),
  };
}
