import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useToast } from '../components/Toast';
import { COMPARE_KEY, readIds, writeJson } from './storage';

export const MAX_COMPARE = 4;
export const COMPARE_LIMIT_MESSAGE = 'You can compare up to four properties at a time.';

interface CompareContextValue {
  ids: string[];
  isComparing: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  /** Replaces the list, for "Compare selected" on the Saved page. */
  replace: (ids: string[]) => void;
  /** Empties the list and offers Undo. */
  clear: () => void;
  /** Empties the list quietly, for logging out. */
  forget: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

/** The compare list stays on this device for everyone (see docs/02-data-model.md). */
export function CompareProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [ids, setIds] = useState(() => readIds(COMPARE_KEY).slice(0, MAX_COMPARE));

  const store = useCallback((next: string[]) => {
    setIds(next);
    writeJson(COMPARE_KEY, next);
  }, []);

  const value = useMemo<CompareContextValue>(() => {
    function add(id: string) {
      if (ids.includes(id)) return;
      if (ids.length >= MAX_COMPARE) {
        toast(COMPARE_LIMIT_MESSAGE, { type: 'error' });
        return;
      }
      store([...ids, id]);
      toast(`Added to compare (${ids.length + 1} of ${MAX_COMPARE}).`);
    }

    return {
      ids,
      isComparing: (id) => ids.includes(id),
      add,
      toggle(id) {
        if (!ids.includes(id)) {
          add(id);
          return;
        }
        store(ids.filter((item) => item !== id));
        toast('Removed from compare.');
      },
      replace: store,
      clear() {
        store([]);
        toast('Comparison cleared.', { undo: () => store(ids) });
      },
      forget: () => store([]),
    };
  }, [ids, store, toast]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const value = useContext(CompareContext);
  if (!value) throw new Error('useCompare must be used inside CompareProvider.');
  return value;
}
