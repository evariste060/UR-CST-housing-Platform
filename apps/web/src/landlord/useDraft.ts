import { useQueryClient } from '@tanstack/react-query';
import { EMPTY_DRAFT, type ListingDraft, type ListingForm, type ListingPatch } from '@urcst/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { LANDLORD_KEY, listingKey } from './queries';

const SAVE_DELAY_MS = 500;
const DRAFT_ID_KEY = 'urcst-wizard-draft';

/** Add accommodation keeps its address, so a refresh finds the draft through this. */
export const readDraftId = () => sessionStorage.getItem(DRAFT_ID_KEY);
export const forgetDraftId = () => sessionStorage.removeItem(DRAFT_ID_KEY);

/**
 * The wizard's answers, saved to the server shortly after each change. Saves run one at a time, so
 * a new draft is only ever created once, and a failed save is tried again with the next one.
 */
export function useDraft(form: ListingForm | null) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ListingDraft>(form?.values ?? EMPTY_DRAFT);
  const [photos, setPhotos] = useState(form?.photos ?? []);
  const [coverId, setCoverId] = useState(form?.coverId ?? null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const listingId = useRef(form?.id ?? null);
  const unsaved = useRef<ListingPatch>({});
  const saves = useRef<Promise<boolean>>(Promise.resolve(true));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showSaved = useCallback(
    (saved: ListingForm) => {
      queryClient.setQueryData(listingKey(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: LANDLORD_KEY });
      setSavedAt(saved.savedAt);
      setSaveFailed(false);
    },
    [queryClient],
  );

  const flush = useCallback(() => {
    clearTimeout(timer.current);

    saves.current = saves.current.then(async () => {
      const patch = unsaved.current;
      if (Object.keys(patch).length === 0) return true;
      unsaved.current = {};

      try {
        const id = listingId.current;
        const saved = id ? await api.updateListing(id, patch) : await api.createListing(patch);
        if (!id) {
          listingId.current = saved.id;
          sessionStorage.setItem(DRAFT_ID_KEY, saved.id);
        }
        showSaved(saved);
        return true;
      } catch {
        unsaved.current = { ...patch, ...unsaved.current };
        setSaveFailed(true);
        return false;
      }
    });
    return saves.current;
  }, [showSaved]);

  const change = useCallback(
    (patch: ListingPatch) => {
      setValues((current) => ({ ...current, ...patch }));
      unsaved.current = { ...unsaved.current, ...patch };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => () => void flush(), [flush]);

  // A refresh gives no time for the delay above, so the last answers go out as the page closes.
  useEffect(() => {
    function saveOnLeave() {
      const id = listingId.current;
      if (!id || Object.keys(unsaved.current).length === 0) return;
      clearTimeout(timer.current);
      void api.saveListingOnLeave(id, unsaved.current).catch(() => undefined);
    }

    window.addEventListener('pagehide', saveOnLeave);
    return () => window.removeEventListener('pagehide', saveOnLeave);
  }, []);

  /** Photo actions save straight away, and the server answers with the new list. */
  const applyPhotos = useCallback(
    (saved: ListingForm) => {
      setPhotos(saved.photos);
      setCoverId(saved.coverId);
      showSaved(saved);
    },
    [showSaved],
  );

  return {
    values,
    photos,
    coverId,
    savedAt,
    saveFailed,
    change,
    flush,
    applyPhotos,
    setPhotos,
    setCoverId,
    getId: () => listingId.current,
  };
}

export type Draft = ReturnType<typeof useDraft>;
