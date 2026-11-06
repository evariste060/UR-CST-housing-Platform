import { searchFiltersSchema, type SearchFilters } from '@urcst/shared';

export const SAVED_KEY = 'urcst-saved';
export const COMPARE_KEY = 'urcst-compare';
export const RECENT_KEY = 'urcst-recent';
export const SEARCHES_KEY = 'urcst-searches';

export const HISTORY_LENGTH = 8;

export function readIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The list still works until the page is reloaded.
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing was saved in that case.
  }
}

export interface LocalSearch {
  label: string;
  filters: SearchFilters;
  at: string;
}

export function readSearches(): LocalSearch[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SEARCHES_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.flatMap((item: Partial<LocalSearch>) => {
      const filters = searchFiltersSchema.safeParse(item?.filters);
      if (!filters.success || typeof item.label !== 'string') return [];
      return [{ label: item.label, filters: filters.data, at: String(item.at) }];
    });
  } catch {
    return [];
  }
}
