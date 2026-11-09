import { ROOM_TYPE_LABELS, type LandlordProperty, type ReviewStatus } from '@urcst/shared';
import { Badge, ReviewBadge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { t, tNode } from '../i18n';

/**
 * The listing's review status in the landlord portal, where "Approved" is shown so landlords can
 * tell it apart from a listing still waiting. Students never see this badge.
 */
export function ListingStatusBadge({ status }: { status: ReviewStatus }) {
  return status === 'APPROVED' ? (
    <Badge tone="approved" icon="check">
      {t('Approved')}
    </Badge>
  ) : (
    <ReviewBadge status={status} />
  );
}

export function TypeChip({ type }: { type: LandlordProperty['type'] }) {
  if (!type) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-2 py-0.5 text-sm font-medium whitespace-nowrap text-blue-700 max-phone:whitespace-normal">
      <Icon name="bed" />
      {tNode(ROOM_TYPE_LABELS[type])}
    </span>
  );
}

/** The cover photo, or a quiet placeholder while there is none. */
export function PropertyThumb({ url, size = 'md' }: { url: string | null; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`grid flex-none place-items-center overflow-hidden rounded-md border border-line bg-surface text-muted ${size === 'lg' ? 'h-[72px] w-24' : 'h-14 w-[72px]'}`}
    >
      {url ? <img className="size-full object-cover" src={url} alt="" /> : <Icon name="image" />}
    </span>
  );
}
