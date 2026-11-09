import { REVIEW_TAB_LABELS, REVIEW_TABS, reviewTabSchema, type AdminListing } from '@urcst/shared';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminReviewBadge, useModeration } from '../../admin/Moderation';
import { ADMIN_PAGE_SIZE, useAdminListings } from '../../admin/queries';
import { CountTabs } from '../../admin/Tabs';
import { AvailabilityBadge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Pagination } from '../../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { formatDate, formatRwf } from '../../lib/format';
import { t, tNode } from '../../i18n';

const TABS = REVIEW_TABS.map((value) => ({ value, label: REVIEW_TAB_LABELS[value] }));

function ListingRow({
  listing,
  onAct,
}: {
  listing: AdminListing;
  onAct: ReturnType<typeof useModeration>['ask'];
}) {
  const { id, title, landlord, rentRwf, area, submittedAt, photoCount, photoUrls, reviewStatus } =
    listing;
  const waiting = reviewStatus === 'PENDING' || reviewStatus === 'CHANGES_REQUESTED';
  const target = { id, title };

  return (
    <li className="list-item flex! flex-wrap items-center gap-4! border-0! border-b! border-solid border-line p-4! last:border-b-0!">
      <span className="flex flex-none gap-1">
        {(photoUrls.length ? photoUrls : [null]).map((url, index) => (
          <span
            key={url ?? index}
            className="grid h-14 w-16 place-items-center overflow-hidden rounded-md border border-line bg-surface text-muted"
          >
            {url ? (
              <img className="size-full object-cover" src={url} alt="" />
            ) : (
              <Icon name="image" />
            )}
          </span>
        ))}
      </span>
      <span className="flex min-w-[220px] flex-1 flex-col gap-1">
        <Link className="font-semibold text-ink" to={`/admin/review/${id}`}>
          {tNode(title)}
        </Link>
        <span className="num text-sm text-muted">
          {tNode(landlord)} · {formatRwf(rentRwf)} · {tNode(area)}
          {submittedAt && t(' · submitted {p0}', { p0: formatDate(submittedAt) })} ·{' '}
          {tNode(photoCount)} {photoCount === 1 ? 'photo' : 'photos'}
        </span>
        <span className="flex flex-wrap gap-2">
          <AdminReviewBadge status={reviewStatus} />
          <AvailabilityBadge availability={listing.availability} />
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        <Link
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
          to={`/admin/review/${id}`}
          aria-label={t('View details of {title}', { title })}
        >
          <Icon name="eye" />
          {t('View details')}
        </Link>
        {waiting && (
          <>
            <Button
              size="sm"
              variant="success"
              icon="check"
              aria-label={t('Approve {title}', { title })}
              onClick={() => onAct('approve', target)}
            >
              {t('Approve')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="edit"
              aria-label={t('Request changes to {title}', { title })}
              onClick={() => onAct('changes', target)}
            >
              {t('Request changes')}
            </Button>
            <Button
              size="sm"
              variant="danger-outline"
              icon="x"
              aria-label={t('Reject {title}', { title })}
              onClick={() => onAct('reject', target)}
            >
              {t('Reject')}
            </Button>
          </>
        )}
      </span>
    </li>
  );
}

export function AdminReviewPage() {
  const [params, setParams] = useSearchParams();
  const parsed = reviewTabSchema.safeParse(params.get('status'));
  const tab = parsed.success ? parsed.data : 'PENDING';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isError, refetch } = useAdminListings(tab, page);
  const moderation = useModeration();

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load listings.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (!data) {
      return (
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-busy="true"
          aria-label={t('Loading listings')}
        >
          <Skeleton height={96} />
          <Skeleton height={96} />
        </div>
      );
    }
    if (data.items.length === 0) {
      return tab === 'PENDING' ? (
        <EmptyState
          icon="shieldcheck"
          title={t('No listings waiting for review')}
          text={t('New submissions from landlords will appear here.')}
        />
      ) : (
        <EmptyState
          icon="shieldcheck"
          title={t('Nothing in this list')}
          text={t('Listings move here after you take an action.')}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <ul
          className="m-0 list-none overflow-hidden rounded-lg border border-line bg-card p-0"
          aria-label={t('{p0} listings', { p0: REVIEW_TAB_LABELS[tab] })}
        >
          {data.items.map((listing) => (
            <ListingRow key={listing.id} listing={listing} onAct={moderation.ask} />
          ))}
        </ul>
        {data.total > ADMIN_PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={data.total}
            noun={t('listings')}
            label={t('Listing pages')}
            onChange={(next) => setParams({ status: tab, page: String(next) })}
          />
        )}
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Listing review')}</h1>
          <p className="muted m-0">{t('Check each listing before students can see it.')}</p>
        </div>
      </div>
      <div className="mb-4">
        <CountTabs
          label={t('Review status')}
          value={tab}
          options={TABS}
          counts={data?.counts}
          onChange={(value) => setParams(value === 'PENDING' ? {} : { status: value })}
        />
      </div>
      {content()}
      {tNode(moderation.dialog)}
    </main>
  );
}
