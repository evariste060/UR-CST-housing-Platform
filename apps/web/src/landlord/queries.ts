import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { InquiryFilter, LandlordFilter } from '@urcst/shared';
import { api } from '../lib/api';

const PAGE_SIZE = 20;

/** Everything under this key refreshes after a change to a listing or an inquiry. */
export const LANDLORD_KEY = ['landlord'];
export const listingKey = (id: string) => ['listing', id];
export const threadKey = (id: string) => [...LANDLORD_KEY, 'inquiry', id];

interface Page {
  page: number;
  pageSize: number;
  total: number;
}

const nextPage = ({ page, pageSize, total }: Page) =>
  page * pageSize < total ? page + 1 : undefined;

export function useLandlordSummary() {
  return useQuery({ queryKey: [...LANDLORD_KEY, 'summary'], queryFn: api.landlordSummary });
}

export function useLandlordProperties(filter: LandlordFilter) {
  return useInfiniteQuery({
    queryKey: [...LANDLORD_KEY, 'properties', filter],
    queryFn: ({ pageParam }) => api.landlordProperties(filter, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useLandlordInquiries(status: InquiryFilter) {
  return useInfiniteQuery({
    queryKey: [...LANDLORD_KEY, 'inquiries', status],
    queryFn: ({ pageParam }) => api.landlordInquiries(status, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useInquiryThread(id: string | null) {
  return useQuery({
    queryKey: threadKey(id ?? ''),
    queryFn: () => api.landlordInquiry(id ?? ''),
    enabled: id !== null,
  });
}

export function useListing(id: string | null) {
  return useQuery({
    queryKey: listingKey(id ?? ''),
    queryFn: () => api.listing(id ?? ''),
    enabled: id !== null,
    retry: false,
  });
}
