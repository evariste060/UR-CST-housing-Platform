import { Link, useParams } from 'react-router-dom';
import { AdminReviewBadge, useModeration } from '../../admin/Moderation';
import { useAdminListing } from '../../admin/queries';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PropertyBody } from '../../components/PropertyBody';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { t, tNode } from '../../i18n';

export function AdminListingDetailPage() {
  const { id = '' } = useParams();
  const { data, error, refetch } = useAdminListing(id);
  const moderation = useModeration();

  if (error) {
    return (
      <main className="page" id="main">
        {error instanceof ApiError && error.status === 404 ? (
          <EmptyState
            icon="home"
            title={t('Listing not found')}
            text={t('It may have been deleted by the landlord.')}
            actions={
              <Link className={buttonClass()} to="/admin/review">
                {t('Back to listing review')}
              </Link>
            }
          />
        ) : (
          <ErrorState
            icon="wifi"
            title={t('Unable to load this listing.')}
            text={error.message}
            actions={
              <Button icon="refresh" onClick={() => void refetch()}>
                {t('Try again')}
              </Button>
            }
          />
        )}
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page" id="main">
        <div
          className="flex flex-col gap-4"
          role="status"
          aria-busy="true"
          aria-label={t('Loading the listing')}
        >
          <Skeleton height={64} />
          <Skeleton height={200} />
        </div>
      </main>
    );
  }

  const { listing, landlord, checklist, reviewNote, submittedAt } = data;
  const status = listing.reviewStatus;
  const waiting = status === 'PENDING' || status === 'CHANGES_REQUESTED';
  const target = { id: listing.id, title: listing.title };
  const passed = checklist.filter(({ ok }) => ok).length;

  return (
    <main className="page" id="main">
      <Link
        className="mb-4 inline-flex min-h-11 items-center gap-1 font-semibold text-blue"
        to="/admin/review"
      >
        <Icon name="chevL" />
        {t('Back to listing review')}
      </Link>
      <section className="mb-6 rounded-lg border border-line bg-card" aria-labelledby="review-h">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="m-0 text-[1.125rem] font-semibold" id="review-h">
              {t('Review checklist')}
            </h2>
            <p className="t-support m-0">
              {t('Submitted by')} {tNode(landlord.name)} ({landlord.email})
              {submittedAt && t(' on {p0}', { p0: formatDate(submittedAt) })}
              {t('. A guide for checking: it does not block approval.')}
            </p>
          </div>
          <span className="flex flex-wrap items-center gap-2">
            <AdminReviewBadge status={status} />
            <span className="num text-sm font-semibold text-muted">
              {tNode(passed)} {t('of')} {tNode(checklist.length)} {t('checks met')}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <ul className="m-0 grid list-none gap-2 p-0 tablet:grid-cols-2">
            {checklist.map(({ key, label, ok }) => (
              <li
                key={key}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 font-medium ${ok ? 'border-[#a7e3bc] bg-green-50 text-green-text dark:border-[#1f5a37]' : 'border-amber-border bg-amber-50 text-amber-text'}`}
              >
                <Icon name={ok ? 'check' : 'alert'} />
                <span>
                  <span className="sr-only">{ok ? t('Met: ') : t('Check: ')}</span>
                  {tNode(label)}
                </span>
              </li>
            ))}
          </ul>
          {reviewNote && (
            <p className="m-0 rounded-md bg-surface p-3">
              <b>{t('Note sent to the landlord:')}</b> {tNode(reviewNote)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {waiting ? (
              <>
                <Button
                  variant="success"
                  icon="check"
                  onClick={() => moderation.ask('approve', target)}
                >
                  {t('Approve listing')}
                </Button>
                <Button
                  variant="secondary"
                  icon="edit"
                  onClick={() => moderation.ask('changes', target)}
                >
                  {t('Request changes')}
                </Button>
                <Button
                  variant="danger-outline"
                  icon="x"
                  onClick={() => moderation.ask('reject', target)}
                >
                  {t('Reject')}
                </Button>
              </>
            ) : status === 'APPROVED' ? (
              <>
                <Link
                  className={buttonClass({ variant: 'secondary' })}
                  to={`/properties/${listing.id}`}
                >
                  <Icon name="eye" />
                  {t('Open student view')}
                </Link>
                <Button
                  variant="danger-outline"
                  icon="trash"
                  onClick={() => moderation.ask('remove', target)}
                >
                  {t('Remove listing')}
                </Button>
              </>
            ) : (
              <p className="t-support m-0">
                {status === 'REMOVED'
                  ? t('No action needed. A removed listing cannot be submitted again.')
                  : t('No action needed. The landlord can edit it and submit it again.')}
              </p>
            )}
          </div>
        </div>
      </section>
      <PropertyBody property={listing} />
      {tNode(moderation.dialog)}
    </main>
  );
}
