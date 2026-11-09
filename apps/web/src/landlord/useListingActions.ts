import { useQueryClient } from '@tanstack/react-query';
import type { Availability, LandlordProperty } from '@urcst/shared';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { LANDLORD_KEY } from './queries';
import { forgetDraftId, readDraftId } from './useDraft';

export const PLACEHOLDER_TITLE = 'Untitled listing';

/** Where View and Edit go for a listing. Only an approved listing has a public page. */
export function listingLinks({ id, reviewStatus }: Pick<LandlordProperty, 'id' | 'reviewStatus'>) {
  return {
    edit: `/landlord/properties/${id}/edit`,
    view: reviewStatus === 'APPROVED' ? `/properties/${id}` : `/landlord/properties/${id}/preview`,
  };
}

export function useListingActions() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: LANDLORD_KEY });

  async function attempt(action: () => Promise<unknown>) {
    try {
      await action();
      await refresh();
      return true;
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      return false;
    }
  }

  return {
    async setAvailability({ id, title, availability }: LandlordProperty, next: Availability) {
      const changed = await attempt(() => api.setAvailability(id, next));
      if (!changed) return;
      toast(
        `Availability updated successfully. ${title} is now ${next === 'OCCUPIED' ? 'occupied' : 'available'}.`,
        {
          undo: () =>
            void attempt(() => api.setAvailability(id, availability)).then(
              (undone) => undone && toast('Change undone.'),
            ),
        },
      );
    },

    async remove({ id }: LandlordProperty) {
      if (!(await attempt(() => api.deleteListing(id)))) return;
      if (readDraftId() === id) forgetDraftId();
      toast('Listing deleted.', {
        undo: () =>
          void attempt(() => api.restoreListing(id)).then(
            (restored) => restored && toast('Listing restored.'),
          ),
      });
    },
  };
}
