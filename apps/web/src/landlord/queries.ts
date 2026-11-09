import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { InquiryFilter, LandlordPropertyQuery } from '@urcst/shared';
import { api } from '../lib/api';

/** Inquiries listed beside the conversation. */
export const INQUIRY_PAGE_SIZE = 8;

/** Everything under this key refreshes after a change to a listing or an inquiry. */
export const LANDLORD_KEY = ['landlord'];
export const listingKey = (id: string) => ['listing', id];
export const threadKey = (id: string) => [...LANDLORD_KEY, 'inquiry', id];

export function useLandlordSummary() {
  return useQuery({ queryKey: [...LANDLORD_KEY, 'summary'], queryFn: api.landlordSummary });
}

export function useLandlordProperties(query: Omit<LandlordPropertyQuery, 'filter'>) {
  return useQuery({
    queryKey: [...LANDLORD_KEY, 'properties', query],
    queryFn: () => api.landlordProperties(query),
    placeholderData: keepPreviousData,
  });
}

export function useLandlordInquiries(status: InquiryFilter, page: number, q: string) {
  return useQuery({
    queryKey: [...LANDLORD_KEY, 'inquiries', status, page, q],
    queryFn: () => api.landlordInquiries(status, page, INQUIRY_PAGE_SIZE, q),
    placeholderData: keepPreviousData,
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
