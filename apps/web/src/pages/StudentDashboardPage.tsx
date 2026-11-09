import type { PropertySummary, StudentInquiry } from '@urcst/shared';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { AvailabilityBadge } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { DashCard, StatCard } from '../components/DashCard';
import { Icon } from '../components/Icon';
import { ReplyBadge } from '../components/InquiryBadge';
import { ErrorState, Skeleton } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { formatKm, formatRwf, formatWhen } from '../lib/format';
import { useSaved } from '../student/SavedProvider';
import { useInquiries, usePropertiesByIds } from '../student/queries';
import { useHistoryData, useRunSearch } from '../student/useHistory';
import { t, tNode } from '../i18n';

const PREVIEW_COUNT = 3;
const INQUIRY_COUNT = 4;
const MESSAGE_PREVIEW = 80;

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="grid h-14 w-[72px] flex-none place-items-center overflow-hidden rounded-md border border-line bg-surface text-muted">
      {url ? <img className="size-full object-cover" src={url} alt="" /> : <Icon name="image" />}
    </span>
  );
}

function PropertyRow({ property }: { property: PropertySummary }) {
  const { id, title, rentRwf, distanceKm, availability, coverUrl } = property;
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <Thumb url={coverUrl} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Link className="truncate font-semibold text-ink" to={`/properties/${id}`}>
          {tNode(title)}
        </Link>
        <span className="num text-sm text-muted">
          {formatRwf(rentRwf)} · {formatKm(distanceKm)} {t('from UR-CST')}
        </span>
      </span>
      <AvailabilityBadge availability={availability} />
    </li>
  );
}

function InquiryRow({ inquiry }: { inquiry: StudentInquiry }) {
  const { property, lastMessage, replied } = inquiry;
  const { body, fromLandlord } = lastMessage;
  const preview = body.length > MESSAGE_PREVIEW ? `${body.slice(0, MESSAGE_PREVIEW)}…` : body;

  return (
    <Link
      className="mini -mx-3 flex items-center gap-3 rounded-md border-0! px-3! py-3! text-ink no-underline transition-colors hover:bg-surface"
      to={`/student/inquiries?open=${inquiry.id}`}
    >
      <Thumb url={property.coverUrl} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <b className="truncate">{tNode(property.title)}</b>
          <span className="num flex-none text-sm text-muted">
            {tNode(formatWhen(lastMessage.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-3">
          <span className="truncate text-[0.9375rem] text-muted">
            {fromLandlord ? t('Landlord: ') : t('You: ')}
            {tNode(preview)}
          </span>
          <span className="flex-none">
            <ReplyBadge replied={replied} />
          </span>
        </span>
      </span>
    </Link>
  );
}

function InquiriesCard({ inquiries }: { inquiries: StudentInquiry[] | undefined }) {
  return (
    <DashCard
      title={t('My inquiries')}
      intro={t('Your latest messages to landlords.')}
      link={{ to: '/student/inquiries', label: 'All inquiries' }}
    >
      {!inquiries ? (
        <div className="stack-sm" role="status" aria-label={t('Loading your inquiries')}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : inquiries.length ? (
        <div className="flex flex-col gap-1">
          {inquiries.slice(0, INQUIRY_COUNT).map((inquiry) => (
            <InquiryRow key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="muted m-0">{t('Messages you send to landlords will appear here.')}</p>
          <Link className={buttonClass({ variant: 'secondary' })} to="/search">
            <Icon name="search" />
            {t('Find a room to ask about')}
          </Link>
        </div>
      )}
    </DashCard>
  );
}

function SavedCard() {
  const saved = useSaved();
  const { items } = usePropertiesByIds(saved.ids.slice(0, PREVIEW_COUNT));

  return (
    <DashCard
      title={t('Saved properties')}
      count={saved.ids.length}
      intro={t('Saving does not reserve the room.')}
      link={{ to: '/saved', label: 'View all' }}
    >
      {items.length ? (
        <ul className="m-0 list-none p-0">
          {items.map((property) => (
            <PropertyRow key={property.id} property={property} />
          ))}
        </ul>
      ) : (
        <p className="muted m-0">
          {t('No saved properties yet. Tap the heart on a listing to save it.')}
        </p>
      )}
    </DashCard>
  );
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const saved = useSaved();
  const { data: inquiries, isError, refetch } = useInquiries();
  const { views, searches } = useHistoryData();
  const runSearch = useRunSearch();
  const toast = useToast();
  const waiting = inquiries?.filter(({ replied }) => !replied).length ?? 0;
  const replies = inquiries?.filter(({ replied }) => replied).length ?? 0;

  return (
    <main className="page" id="main">
      <div className="page-head items-center!">
        <div>
          <h1 className="t-page">
            {t('Welcome back,')} {user?.fullName}
          </h1>
          <p className="muted m-0">{t('Pick up where you left off.')}</p>
        </div>
        <Link className={buttonClass()} to="/search">
          <Icon name="search" />
          {t('Find accommodation')}
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-4 max-[1279px]:grid-cols-2 max-phone:grid-cols-1">
          <StatCard
            to="/saved"
            label={t('Saved')}
            value={saved.ids.length}
            hint={t('Properties on your list')}
            icon="heart"
          />
          <StatCard
            to="/student/inquiries"
            label={t('Inquiries sent')}
            value={inquiries?.length ?? 0}
            hint={t('Messages to landlords')}
            icon="message"
          />
          <StatCard
            to="/student/inquiries"
            label={t('Replies received')}
            value={replies}
            hint={t('Landlords who answered')}
            icon="check"
          />
          <StatCard
            to="/student/inquiries"
            label={t('Awaiting reply')}
            value={waiting}
            hint={t('Still waiting to hear back')}
            icon="clock"
          />
        </div>
        {isError ? (
          <ErrorState
            icon="wifi"
            title={t('Unable to load your inquiries.')}
            text={t('Check your internet connection, then try again.')}
            actions={
              <Button icon="refresh" onClick={() => void refetch()}>
                {t('Try again')}
              </Button>
            }
          />
        ) : null}
        <div className="grid grid-cols-1 gap-6 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            {!isError && <InquiriesCard inquiries={inquiries} />}
            <SavedCard />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <DashCard title={t('Recently viewed')} link={{ to: '/history', label: 'View history' }}>
              {views.length ? (
                <ul className="m-0 list-none p-0">
                  {views.slice(0, PREVIEW_COUNT).map((property) => (
                    <PropertyRow key={property.id} property={property} />
                  ))}
                </ul>
              ) : (
                <p className="muted m-0">{t('Nothing viewed yet.')}</p>
              )}
            </DashCard>
            <DashCard
              title={t('Recent searches')}
              link={{ to: '/history', label: 'All', ariaLabel: 'All recent searches' }}
            >
              {searches.length ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {searches.slice(0, PREVIEW_COUNT).map((search) => (
                    <li
                      key={search.key}
                      className="flex items-center gap-3 rounded-md border border-line p-3"
                    >
                      <span className="grid size-10 flex-none place-items-center rounded-full bg-blue-50 text-blue-700">
                        <Icon name="search" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <b className="break-words">{tNode(search.label)}</b>
                        <span className="text-sm text-muted">{tNode(search.when)}</span>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={t('Re-run {label}', { label: search.label })}
                        onClick={() => {
                          runSearch(search.filters);
                          toast(t('Search re-run: {label}', { label: search.label }));
                        }}
                      >
                        {t('Re-run')}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted m-0">{t('No searches yet.')}</p>
              )}
              <p className="mt-4 mb-0 flex gap-2 rounded-md bg-surface p-3 text-sm text-muted">
                <Icon name="bell" />
                <span>
                  <b className="text-ink">{t('Housing alerts')}</b>{' '}
                  {t(
                    '(planned enhancement): get notified when a matching room is listed. Not available in this pilot.',
                  )}
                </span>
              </p>
            </DashCard>
          </div>
        </div>
      </div>
    </main>
  );
}
