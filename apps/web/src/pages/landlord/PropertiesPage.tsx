import {
  LISTING_STATUS_FILTERS,
  landlordPropertiesQuerySchema,
  type LandlordFilter,
  type LandlordProperty,
  type LandlordPropertyQuery,
} from '@urcst/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Pagination } from '../../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { formatDate, formatKm, formatNumber } from '../../lib/format';
import { DeleteListingDialog } from '../../landlord/DeleteListingDialog';
import { ListingStatusBadge, TypeChip } from '../../landlord/ListingStatusBadge';
import {
  Availability,
  PropertyActions,
  PropertyTable,
  Rent,
  type RowHandlers,
} from '../../landlord/PropertyTable';
import { useLandlordProperties } from '../../landlord/queries';
import { PLACEHOLDER_TITLE, useListingActions } from '../../landlord/useListingActions';
import { t, tNode } from '../../i18n';

const PAGE_SIZE = 10;
const ADD_PROPERTY = '/landlord/properties/new';

type Query = Omit<LandlordPropertyQuery, 'filter'>;
type Status = (typeof LISTING_STATUS_FILTERS)[number];

/** The quick filters set the two dropdowns, so they never disagree. */
const TABS: { key: LandlordFilter; label: string; set: Pick<Query, 'availability' | 'status'> }[] =
  [
    { key: 'all', label: 'All Properties', set: { availability: 'all', status: 'all' } },
    { key: 'available', label: 'Available', set: { availability: 'available', status: 'all' } },
    { key: 'occupied', label: 'Occupied', set: { availability: 'occupied', status: 'all' } },
    { key: 'pending', label: 'Pending Review', set: { availability: 'all', status: 'PENDING' } },
  ];

const STATUS_LABELS: Record<Status, string> = {
  all: 'All listing statuses',
  DRAFT: 'Draft',
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
  REJECTED: 'Rejected',
  REMOVED: 'Removed by admin',
};

const DEFAULTS: Query = {
  availability: 'all',
  status: 'all',
  q: '',
  sort: 'updated-desc',
  page: 1,
  pageSize: PAGE_SIZE,
};

/** Reads the filters from the address, falling back to a default for anything unexpected. */
function readQuery(params: URLSearchParams): Query {
  const pick = <K extends keyof Query>(key: K): Query[K] => {
    const value = params.get(key);
    if (value === null) return DEFAULTS[key];
    const parsed = landlordPropertiesQuerySchema.shape[key].safeParse(value);
    return parsed.success ? (parsed.data as Query[K]) : DEFAULTS[key];
  };
  return {
    availability: pick('availability'),
    status: pick('status'),
    q: pick('q'),
    sort: pick('sort'),
    page: pick('page'),
    pageSize: PAGE_SIZE,
  };
}

function Notes({ property }: { property: LandlordProperty }) {
  return (
    <>
      {property.reviewNote && (
        <p className="t-help landlord-note m-0!">
          <Icon name="info" /> {t('Admin note:')} {tNode(property.reviewNote)}
        </p>
      )}
      {property.reviewStatus !== 'DRAFT' && property.hasUnsubmittedChanges && (
        <p className="t-help landlord-note m-0!">
          <Icon name="info" />{' '}
          {t(
            'You have changes that have not been submitted. Students still see the last approved version.',
          )}
        </p>
      )}
    </>
  );
}

function LandlordCard({ property, ...handlers }: { property: LandlordProperty } & RowHandlers) {
  const { area, distanceKm, reviewStatus, coverUrl } = property;
  const title = property.title || PLACEHOLDER_TITLE;

  return (
    <article
      className="pcard flex flex-col overflow-hidden rounded-lg border border-line bg-card transition-shadow hover:shadow-raised"
      aria-label={tNode(title)}
    >
      <div className="media relative aspect-[16/10] bg-surface">
        {coverUrl ? (
          <img className="size-full object-cover" src={coverUrl} alt="" />
        ) : (
          <span className="grid size-full place-items-center text-muted [&>.ic]:size-8">
            <Icon name="image" />
          </span>
        )}
        <ListingStatusBadge status={reviewStatus} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <b className="t-card line-clamp-2 break-words">{tNode(title)}</b>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" />
              {area ?? t('Location not set')}
              {distanceKm !== null && <span className="num"> · {formatKm(distanceKm)}</span>}
            </span>
            <TypeChip type={property.type} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-y border-line py-3">
          <span className="flex flex-col">
            <span className="text-sm text-muted">{t('Monthly rent')}</span>
            <Rent rentRwf={property.rentRwf} />
          </span>
          <span className="flex flex-col items-end gap-1">
            <span className="k text-sm text-muted">{t('Room availability')}</span>
            <Availability property={property} />
          </span>
        </div>
        <Notes property={property} />
        <p className="num m-0 text-sm text-muted">
          {t('Updated')} {tNode(formatDate(property.updatedAt))}
        </p>
        <div className="mt-auto">
          <PropertyActions property={property} stretch {...handlers} />
        </div>
      </div>
    </article>
  );
}

export function PropertiesPage() {
  const [params, setParams] = useSearchParams();
  const query = readQuery(params);
  const list = useLandlordProperties(query);
  const actions = useListingActions();
  const [deleting, setDeleting] = useState<LandlordProperty | null>(null);
  const data = list.data;
  const counts = data?.counts;
  const changed =
    query.q !== '' ||
    query.availability !== 'all' ||
    query.status !== 'all' ||
    query.sort !== DEFAULTS.sort;

  /** Changing a filter goes back to page 1. Defaults are left out of the address. */
  function update(changes: Partial<Query>) {
    const next = { ...query, page: 1, ...changes };
    const entries = (['q', 'availability', 'status', 'sort', 'page'] as const)
      .filter((key) => next[key] !== DEFAULTS[key])
      .map((key) => [key, String(next[key])]);
    setParams(Object.fromEntries(entries), { replace: true });
  }

  const handlers: RowHandlers = {
    onToggle: (property) =>
      void actions.setAvailability(
        property,
        property.availability === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE',
      ),
    onDelete: setDeleting,
  };

  function content() {
    if (list.isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load your properties. Please try again.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void list.refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (!data) {
      return (
        <div
          className="stack"
          role="status"
          aria-busy="true"
          aria-label={t('Loading your properties')}
        >
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </div>
      );
    }
    if (data.counts.all === 0) {
      return (
        <EmptyState
          icon="building"
          title={t('You have not added any properties yet')}
          text={t('Add your first accommodation to start receiving student inquiries.')}
          actions={
            <Link className={buttonClass()} to={ADD_PROPERTY}>
              <Icon name="plus" />
              {t('Add Property')}
            </Link>
          }
        />
      );
    }
    if (data.items.length === 0) {
      return (
        <EmptyState
          icon="search"
          title={t('No properties match your filters')}
          text={t('Try a different search word, or clear the filters to see all your properties.')}
          actions={
            <Button variant="secondary" icon="x" onClick={() => update(DEFAULTS)}>
              {t('Clear filters')}
            </Button>
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-5" aria-busy={list.isPlaceholderData}>
        <PropertyTable items={data.items} caption={t('Your properties')} {...handlers} />
        <div className="grid grid-cols-3 gap-4 max-desktop:grid-cols-2 max-phone:grid-cols-1 min-[1440px]:hidden">
          {data.items.map((property) => (
            <LandlordCard key={property.id} property={property} {...handlers} />
          ))}
        </div>
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          noun={t('properties')}
          label={t('Property pages')}
          onChange={(page) => update({ page })}
        />
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head items-center!">
        <div>
          <h1 className="t-page">{t('My Properties')}</h1>
          <p className="muted m-0">{t('Manage all your accommodation listings in one place.')}</p>
        </div>
        <Link className={buttonClass()} to={ADD_PROPERTY}>
          <Icon name="plus" />
          {t('Add Property')}
        </Link>
      </div>
      <section className="rounded-lg border border-line bg-card" aria-label={t('Your listings')}>
        <div className="flex flex-col gap-4 border-b border-line p-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('Quick filters')}>
            {TABS.map(({ key, label, set }) => {
              const active = query.availability === set.availability && query.status === set.status;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  className="group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-4 font-semibold text-ink transition-colors hover:border-blue hover:bg-blue-50 aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-white"
                  onClick={() => update(set)}
                >
                  {active && <Icon name="check" />}
                  {tNode(label)}
                  {counts && (
                    <span className="num min-w-7 rounded-full bg-slate-100 px-2 text-sm text-ink group-aria-pressed:bg-white group-aria-pressed:text-[#0f172a]">
                      {formatNumber(counts[key])}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <form
            className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,200px))] gap-3 max-desktop:grid-cols-3 max-phone:grid-cols-1"
            role="search"
            aria-label={t('Filter your properties')}
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="relative max-desktop:col-span-3 max-phone:col-span-1">
              <label className="sr-only" htmlFor="prop-q">
                {t('Search your properties')}
              </label>
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted">
                <Icon name="search" />
              </span>
              <input
                id="prop-q"
                className="input pl-10!"
                type="search"
                maxLength={100}
                value={query.q}
                placeholder={t('Search by name or location')}
                onChange={(event) => update({ q: event.target.value })}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="prop-availability">
                {t('Availability')}
              </label>
              <select
                id="prop-availability"
                className="select"
                value={query.availability}
                onChange={(event) =>
                  update({ availability: event.target.value as Query['availability'] })
                }
              >
                <option value="all">{t('All availability')}</option>
                <option value="available">{t('Available only')}</option>
                <option value="occupied">{t('Occupied only')}</option>
              </select>
            </div>
            <div>
              <label className="sr-only" htmlFor="prop-status">
                {t('Listing status')}
              </label>
              <select
                id="prop-status"
                className="select"
                value={query.status}
                onChange={(event) => update({ status: event.target.value as Status })}
              >
                {LISTING_STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {tNode(STATUS_LABELS[status])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="sr-only" htmlFor="prop-sort">
                {t('Sort by')}
              </label>
              <select
                id="prop-sort"
                className="select"
                value={query.sort}
                onChange={(event) => update({ sort: event.target.value as Query['sort'] })}
              >
                <option value="updated-desc">{t('Recently updated first')}</option>
                <option value="updated-asc">{t('Oldest updated first')}</option>
              </select>
            </div>
          </form>
          {changed && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="t-support m-0 num" aria-live="polite">
                {data
                  ? t('{p0} matching properties', { p0: formatNumber(data.total) })
                  : t('Searching…')}
              </p>
              <button type="button" className="link-btn min-h-11" onClick={() => update(DEFAULTS)}>
                <Icon name="x" /> {t('Clear filters')}
              </button>
            </div>
          )}
        </div>
        <div className="p-5">{content()}</div>
      </section>
      {deleting && (
        <DeleteListingDialog
          property={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setDeleting(null);
            void actions.remove(deleting);
          }}
        />
      )}
    </main>
  );
}
