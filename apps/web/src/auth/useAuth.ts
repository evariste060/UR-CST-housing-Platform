import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser, MeResponse, Role } from '@urcst/shared';
import { useCallback } from 'react';
import { api } from '../lib/api';

const ME_KEY = ['me'];

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/student',
  LANDLORD: '/landlord',
  ADMIN: '/admin',
};

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ME_KEY,
    // A failed check means "guest", never an error state. An error state would refetch every
    // time a form mounts, which unmounts the form and repeats forever.
    queryFn: () => api.me().catch((): MeResponse => ({ user: null })),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const setUser = useCallback(
    (user: AuthUser | null) => {
      queryClient.setQueryData<MeResponse>(ME_KEY, { user });
    },
    [queryClient],
  );

  return { user: data?.user ?? null, isPending, setUser };
}
