import { useQueryClient } from '@tanstack/react-query';
import { listingErrors, stepErrors, type ListingDraft } from '@urcst/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { LANDLORD_KEY, listingKey } from './queries';
import { forgetDraftId } from './useDraft';
import { t, tNode } from '../i18n';

interface SubmitButtonProps {
  id: string;
  values: ListingDraft;
  photoCount: number;
  label: string;
  size?: 'lg';
  /** Saves anything still being typed. */
  beforeSubmit?: () => Promise<boolean>;
}

export function SubmitButton({
  id,
  values,
  photoCount,
  label,
  size,
  beforeSubmit,
}: SubmitButtonProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (beforeSubmit && !(await beforeSubmit())) {
      toast('We could not save your draft. Check your connection and try again.', {
        type: 'error',
      });
      return;
    }
    if (Object.keys(listingErrors(values, photoCount)).length > 0) {
      const step = [1, 2, 3, 4].find(
        (number) => Object.keys(stepErrors(number, values, photoCount)).length > 0,
      );
      toast('Some information is missing. Please check this step.', { type: 'error' });
      navigate(`/landlord/properties/${id}/edit?step=${step}`);
      return;
    }
    setConfirming(true);
  }

  async function submit() {
    setConfirming(false);
    setBusy(true);
    try {
      await api.submitListing(id);
      forgetDraftId();
      queryClient.removeQueries({ queryKey: listingKey(id) });
      await queryClient.invalidateQueries({ queryKey: LANDLORD_KEY });
      toast('Your listing has been submitted for review.');
      navigate(`/landlord/properties/${id}/submitted`);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} icon="send" disabled={busy} onClick={() => void ask()}>
        {tNode(label)}
      </Button>
      {confirming && (
        <ConfirmDialog
          title={t('Submit this listing for review?')}
          body={t(
            'An administrator will check it before students can see it. You can still edit it while it is pending.',
          )}
          confirm={t('Submit Listing')}
          icon="send"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void submit()}
        />
      )}
    </>
  );
}
