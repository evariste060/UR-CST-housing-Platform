import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PropertySummary, SearchFilters } from '@urcst/shared';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { searchLabel, searchPath } from './filters';
import { usePropertiesByIds } from './queries';
import {
  HISTORY_LENGTH,
  readIds,
  readSearches,
  RECENT_KEY,
  removeKey,
  SEARCHES_KEY,
  writeJson,
  type LocalSearch,
} from './storage';

export interface HistorySearch {
  key: string;
  label: string;
  filters: SearchFilters;
  when: string;
}

export function useStudentId() {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? user.id : null;
}

const historyKey = (studentId: string | null) => ['history', studentId];

/** Adds a listing to this device's Recently viewed. For students, the server records views. */
export function rememberView(id: string) {
  const recent = [id, ...readIds(RECENT_KEY).filter((item) => item !== id)];
  writeJson(RECENT_KEY, recent.slice(0, HISTORY_LENGTH));
}

/** Records a search in the right place, then opens it. */
export function useRunSearch() {
  const navigate = useNavigate();
  const studentId = useStudentId();
  const queryClient = useQueryClient();

  return useCallback(
    (filters: SearchFilters) => {
      const label = searchLabel(filters);

      if (studentId) {
        void api
          .recordSearch({ label, filters })
          .then(() => queryClient.invalidateQueries({ queryKey: historyKey(studentId) }))
          // History is a convenience, so a failure never gets in the way of the search.
          .catch(() => undefined);
      } else {
        const searches = readSearches();
        if (searches[0]?.label !== label) {
          const entry: LocalSearch = { label, filters, at: new Date().toISOString() };
          writeJson(SEARCHES_KEY, [entry, ...searches].slice(0, HISTORY_LENGTH));
        }
      }
      navigate(searchPath(filters));
    },
    [navigate, queryClient, studentId],
  );
}

export function useHistoryData() {
  const studentId = useStudentId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [localIds, setLocalIds] = useState(() => readIds(RECENT_KEY));
  const [localSearches, setLocalSearches] = useState(readSearches);

  const server = useQuery({
    queryKey: historyKey(studentId),
    queryFn: api.history,
    enabled: studentId !== null,
  });
  const local = usePropertiesByIds(studentId ? [] : localIds);

  const views: PropertySummary[] = useMemo(
    () => (studentId ? (server.data?.views ?? []).map(({ property }) => property) : local.items),
    [local.items, server.data, studentId],
  );

  const searches: HistorySearch[] = useMemo(
    () =>
      studentId
        ? (server.data?.searches ?? []).map(({ id, label, filters, createdAt }) => ({
            key: id,
            label,
            filters,
            when: formatDate(createdAt),
          }))
        : localSearches.map(({ label, filters, at }, index) => ({
            key: `${index}-${label}`,
            label,
            filters,
            when: formatDate(at),
          })),
    [localSearches, server.data, studentId],
  );

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: historyKey(studentId) }),
    [queryClient, studentId],
  );

  async function clear() {
    if (!studentId) {
      const ids = localIds;
      const saved = localSearches;
      removeKey(RECENT_KEY);
      removeKey(SEARCHES_KEY);
      setLocalIds([]);
      setLocalSearches([]);
      toast('History cleared.', {
        undo: () => {
          writeJson(RECENT_KEY, ids);
          writeJson(SEARCHES_KEY, saved);
          setLocalIds(ids);
          setLocalSearches(saved);
        },
      });
      return;
    }

    const before = server.data;
    await api.clearHistory();
    await refresh();
    toast('History cleared.', {
      undo: () => {
        if (!before) return;
        void api
          .restoreHistory({
            views: before.views.map(({ property, viewedAt }) => ({
              propertyId: property.id,
              viewedAt,
            })),
            searches: before.searches.map(({ label, filters, createdAt }) => ({
              label,
              filters,
              createdAt,
            })),
          })
          .then(refresh)
          .catch(() =>
            toast('We could not restore your history. Please try again.', { type: 'error' }),
          );
      },
    });
  }

  return {
    views,
    searches,
    isPending: studentId ? server.isPending : local.isPending,
    isError: studentId ? server.isError : local.isError,
    retry: () => void (studentId ? server.refetch() : local.refetch()),
    clear,
  };
}
