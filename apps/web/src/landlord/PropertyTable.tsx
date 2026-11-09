import type { LandlordProperty } from '@urcst/shared';
import { Link } from 'react-router-dom';
import { AvailabilityBadge } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { formatDate, formatNumber } from '../lib/format';
import { ListingStatusBadge, PropertyThumb, TypeChip } from './ListingStatusBadge';
import { PLACEHOLDER_TITLE, listingLinks } from './useListingActions';
import { t, tNode } from '../i18n';

export interface RowHandlers {
  onToggle: (property: LandlordProperty) => void;
  /** Leave out to hide Delete, as on the dashboard. */
  onDelete?: (property: LandlordProperty) => void;
}

const ICON_BUTTON =
  'inline-grid size-11 flex-none cursor-pointer place-items-center rounded-md border border-line bg-card text-ink no-underline transition-colors hover:border-blue hover:bg-blue-50 hover:text-blue-700';
const DELETE_BUTTON =
  'inline-grid size-11 flex-none cursor-pointer place-items-center rounded-md border border-line bg-card text-red-text transition-colors hover:border-red-border hover:bg-red-50';

function IconLink({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link className={ICON_BUTTON} to={to} aria-label={tNode(label)} title={label}>
      <Icon name={icon} />
    </Link>
  );
}

/** One row of actions: the main one in words, the rest as labelled icon buttons. */
export function PropertyActions({
  property,
  onToggle,
  onDelete,
  stretch = false,
}: { property: LandlordProperty; stretch?: boolean } & RowHandlers) {
  const title = property.title || PLACEHOLDER_TITLE;
  const { view, edit } = listingLinks(property);
  const isDraft = property.reviewStatus === 'DRAFT';
  const removed = property.reviewStatus === 'REMOVED';
  const occupied = property.availability === 'OCCUPIED';
  const main = stretch ? 'flex-1 whitespace-nowrap' : 'whitespace-nowrap';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isDraft ? (
        <Link
          className={`${buttonClass({ size: 'sm' })} ${main}`}
          to={edit}
          aria-label={t('Continue with {title}', { title })}
        >
          <Icon name="edit" />
          {t('Continue')}
        </Link>
      ) : (
        !removed && (
          <Button
            className={`${main} hover:border-blue! hover:bg-blue-50! hover:text-blue-700!`}
            variant="secondary"
            size="sm"
            icon={occupied ? 'check' : 'door'}
            aria-label={t('Mark as {p0}: {title}', {
              p0: occupied ? 'available' : 'occupied',
              title,
            })}
            onClick={() => onToggle(property)}
          >
            {t('Mark as')} {occupied ? 'available' : 'occupied'}
          </Button>
        )
      )}
      {!isDraft && <IconLink to={view} icon="eye" label={t('View {title}', { title })} />}
      {!isDraft && !removed && (
        <IconLink to={edit} icon="edit" label={t('Edit {title}', { title })} />
      )}
      {onDelete && (
        <button
          type="button"
          className={DELETE_BUTTON}
          aria-label={t('Delete {title}', { title })}
          title={t('Delete {title}', { title })}
          onClick={() => onDelete(property)}
        >
          <Icon name="trash" />
        </button>
      )}
    </div>
  );
}

/** Neighbourhood, type and last change, under the title. */
export function PropertyMeta({ property }: { property: LandlordProperty }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span className="inline-flex items-center gap-1">
        <Icon name="pin" />
        {property.area ?? t('Location not set')}
      </span>
      <TypeChip type={property.type} />
      <span className="num">
        {t('Updated')} {tNode(formatDate(property.updatedAt))}
      </span>
    </span>
  );
}

export function Rent({ rentRwf }: { rentRwf: number | null }) {
  if (rentRwf === null) return <span className="text-muted">{t('Not set')}</span>;
  return (
    <span className="num whitespace-nowrap">
      <b className="text-ink">{formatNumber(rentRwf)}</b>{' '}
      <span className="text-sm text-muted">{t('RWF')}</span>
    </span>
  );
}

export function Availability({ property }: { property: LandlordProperty }) {
  return property.reviewStatus === 'DRAFT' ? (
    <span className="text-muted">{t('Not listed yet')}</span>
  ) : (
    <AvailabilityBadge availability={property.availability} />
  );
}

const HEAD =
  'border-b border-line bg-surface px-4 py-3 text-left text-sm font-semibold whitespace-nowrap text-muted';
const CELL = 'border-b border-line px-4 py-4 align-middle';

/** Shown from 1440px. Smaller screens use cards. */
export function PropertyTable({
  items,
  caption,
  ...handlers
}: { items: LandlordProperty[]; caption: string } & RowHandlers) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-line min-[1440px]:block">
      <table className="w-full border-collapse bg-card">
        <caption className="sr-only">{tNode(caption)}</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              {t('Property')}
            </th>
            <th scope="col" className={HEAD}>
              {t('Monthly rent')}
            </th>
            <th scope="col" className={HEAD}>
              {t('Availability')}
            </th>
            <th scope="col" className={HEAD}>
              {t('Listing status')}
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              {t('Actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((property) => (
            <tr key={property.id} className="transition-colors last:*:border-b-0 hover:bg-surface">
              <th scope="row" className={`${CELL} text-left font-normal`}>
                <span className="flex items-center gap-3">
                  <PropertyThumb url={property.coverUrl} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <b className="line-clamp-2 max-w-[340px] break-words text-ink">
                      {property.title || PLACEHOLDER_TITLE}
                    </b>
                    <PropertyMeta property={property} />
                  </span>
                </span>
                {property.reviewNote && (
                  <p className="t-help landlord-note mt-2! mb-0!">
                    <Icon name="info" /> {t('Admin note:')} {tNode(property.reviewNote)}
                  </p>
                )}
              </th>
              <td className={CELL}>
                <Rent rentRwf={property.rentRwf} />
              </td>
              <td className={CELL}>
                <Availability property={property} />
              </td>
              <td className={CELL}>
                <ListingStatusBadge status={property.reviewStatus} />
              </td>
              <td className={CELL}>
                <div className="flex justify-end">
                  <PropertyActions property={property} {...handlers} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
