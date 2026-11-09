import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { ReportStatusFilter, ReviewTab, UserRoleFilter } from '@urcst/shared';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';

export const ADMIN_PAGE_SIZE = 20;

/** Everything under this key refreshes after a moderation action. */
const ADMIN_KEY = ['admin'];

export function useAdminSummary() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'summary'], queryFn: api.adminSummary });
}

export function useAdminListings(status: ReviewTab, page: number) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'listings', status, page],
    queryFn: () => api.adminListings(status, page, ADMIN_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

export function useAdminListing(id: string) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'listing', id],
    queryFn: () => api.adminListing(id),
    retry: false,
  });
}

export function useAdminUsers(role: UserRoleFilter, q: string, page: number) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'users', role, q, page],
    queryFn: () => api.adminUsers(role, q, page, ADMIN_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'user', id],
    queryFn: () => api.adminUser(id ?? ''),
    enabled: id !== null,
  });
}

export function useAdminReports(status: ReportStatusFilter, page: number) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'reports', status, page],
    queryFn: () => api.adminReports(status, page, ADMIN_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

export function useAdminLocations(q: string, page: number) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'locations', q, page],
    queryFn: () => api.adminLocations(q, page, ADMIN_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

/**
 * Runs an administrator action, then refreshes every admin list and the public listings, so an
 * approved listing shows in search straight away. Shows `success`, or the server's reason it failed.
 */
export function useAdminAction<T>(action: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = (key: QueryKey) => queryClient.invalidateQueries({ queryKey: key });

  const mutation = useMutation({
    mutationFn: action,
    onSettled: () =>
      Promise.all([
        refresh(ADMIN_KEY),
        refresh(['properties']),
        refresh(['property']),
        refresh(['locations']),
        refresh(['notifications']),
      ]),
  });

  return (input: T, success: string, onDone?: () => void) =>
    mutation.mutate(input, {
      onSuccess: () => {
        toast(success);
        onDone?.();
      },
      onError: (error) =>
        toast(error instanceof Error ? error.message : 'Something went wrong. Please try again.', {
          type: 'error',
        }),
    });
}
