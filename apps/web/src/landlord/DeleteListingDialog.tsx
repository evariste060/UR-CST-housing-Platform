import type { LandlordProperty } from '@urcst/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PLACEHOLDER_TITLE } from './useListingActions';
import { t } from '../i18n';

export function DeleteListingDialog({
  property,
  onCancel,
  onConfirm,
}: {
  property: LandlordProperty;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      title={t('Are you sure you want to delete this listing?')}
      body={t('"{p0}" will be removed from your properties and students will no longer see it.', {
        p0: property.title || PLACEHOLDER_TITLE,
      })}
      confirm={t('Delete listing')}
      tone="danger"
      icon="trash"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
