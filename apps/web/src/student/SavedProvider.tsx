import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedIdsResponse } from '@urcst/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { readIds, removeKey, SAVED_KEY, writeJson } from './storage';

interface SavedContextValue {
  ids: string[];
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

const SAVED_MESSAGE = 'Saved to your list. This does not reserve the room.';
const REMOVED_MESSAGE = 'Removed from saved.';

/**
 * Students keep their list in their account. Everyone else keeps it on this device, and a guest's
 * list moves into the account when they log in or register.
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [localIds, setLocalIds] = useState(() => readIds(SAVED_KEY));

  const studentId = user?.role === 'STUDENT' ? user.id : null;
  const idsKey = useMemo(() => ['saved-ids', studentId], [studentId]);
  const { data } = useQuery({
    queryKey: idsKey,
    queryFn: api.savedIds,
    enabled: studentId !== null,
  });

  useEffect(() => {
    if (!studentId || localIds.length === 0) return;
    let stale = false;

    api
      .mergeSaved(localIds)
      .then(() => {
        if (stale) return;
        removeKey(SAVED_KEY);
        setLocalIds([]);
        void queryClient.invalidateQueries({ queryKey: idsKey });
      })
      // The list stays on this device, and the next visit tries again.
      .catch(() => undefined);

    return () => {
      stale = true;
    };
  }, [studentId, localIds, idsKey, queryClient]);

  const ids = useMemo(
    () => (studentId ? (data?.ids ?? []) : localIds),
    [studentId, data, localIds],
  );

  const setLocal = useCallback((next: (current: string[]) => string[]) => {
    setLocalIds((current) => {
      const updated = next(current);
      writeJson(SAVED_KEY, updated);
      return updated;
    });
  }, []);

  const change = useCallback(
    async (id: string, save: boolean) => {
      const update = (current: string[]) =>
        save ? [...current.filter((item) => item !== id), id] : current.filter((x) => x !== id);

      if (!studentId) {
        setLocal(update);
        return;
      }

      queryClient.setQueryData<SavedIdsResponse>(idsKey, (current) => ({
        ids: update(current?.ids ?? []),
      }));
      try {
        await (save ? api.save(id) : api.unsave(id));
      } catch (error) {
        toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      } finally {
        await queryClient.invalidateQueries({ queryKey: idsKey });
        await queryClient.invalidateQueries({ queryKey: ['saved-list'] });
      }
    },
    [idsKey, queryClient, setLocal, studentId, toast],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      ids,
      isSaved: (id) => ids.includes(id),
      toggle(id) {
        const save = !ids.includes(id);
        void change(id, save);
        toast(save ? SAVED_MESSAGE : REMOVED_MESSAGE, { undo: () => void change(id, !save) });
      },
    }),
    [change, ids, toast],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const value = useContext(SavedContext);
  if (!value) throw new Error('useSaved must be used inside SavedProvider.');
  return value;
}
