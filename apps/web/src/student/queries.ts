import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { PropertySort, PropertySummary, SearchFilters } from '@urcst/shared';
import { useMemo } from 'react';
import { api } from '../lib/api';
import { filtersToParams } from './filters';

const PAGE_SIZE = 20;
const FIVE_MINUTES = 5 * 60 * 1000;

export const propertyKey = (id: string) => ['property', id];

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => (await api.locations()).items,
    staleTime: FIVE_MINUTES,
  });
}

export function useFeatured() {
  return useQuery({
    queryKey: ['featured'],
    queryFn: async () => (await api.featured()).items,
  });
}

export function usePropertySearch(filters: SearchFilters, sort: PropertySort) {
  const query = filtersToParams(filters, sort).toString();

  return useInfiniteQuery({
    queryKey: ['properties', query],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(query);
      params.set('page', String(pageParam));
      params.set('pageSize', String(PAGE_SIZE));
      return api.properties(params);
    },
    initialPageParam: 1,
    getNextPageParam: ({ page, pageSize, total }) =>
      page * pageSize < total ? page + 1 : undefined,
    // The old results stay up while new ones load, so the page does not jump.
    placeholderData: keepPreviousData,
  });
}

/** How many listings a past search finds today. */
export async function countResults(filters: SearchFilters) {
  const params = filtersToParams(filters);
  params.set('pageSize', '1');
  return (await api.properties(params)).total;
}

export function useResultCount(filters: SearchFilters) {
  return useQuery({
    queryKey: ['result-count', filtersToParams(filters).toString()],
    queryFn: () => countResults(filters),
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKey(id),
    queryFn: () => api.property(id),
    retry: false,
  });
}

/**
 * Named listings in the order given, for Compare and a guest's lists. Anything no longer approved
 * comes back from the server missing, so it drops out here.
 */
export function usePropertiesByIds(ids: string[]) {
  const key = ids.join(',');
  const query = useQuery({
    queryKey: ['properties-by-id', key],
    queryFn: async () => {
      const params = new URLSearchParams({ ids: key, pageSize: '50' });
      return (await api.properties(params)).items;
    },
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => {
    const byId = new Map<string, PropertySummary>(
      (query.data ?? []).map((property) => [property.id, property]),
    );
    return ids.flatMap((id) => byId.get(id) ?? []);
  }, [ids, query.data]);

  return { ...query, items, isPending: ids.length > 0 && query.isPending };
}

export function useInquiries(enabled = true) {
  return useQuery({
    queryKey: ['inquiries'],
    queryFn: async () => (await api.inquiries()).items,
    enabled,
  });
}
