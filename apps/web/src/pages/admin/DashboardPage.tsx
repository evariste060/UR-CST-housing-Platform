import { Link } from 'react-router-dom';
import { useAdminSummary } from '../../admin/queries';
import { useAuth } from '../../auth/useAuth';
import { Button, buttonClass } from '../../components/Button';
import { DashCard, StatCard } from '../../components/DashCard';
import { Icon, type IconName } from '../../components/Icon';
import { ErrorState, Skeleton } from '../../components/StateBlocks';
import { formatDate, formatDay, formatTime } from '../../lib/format';
import { t, tNode } from '../../i18n';

const ACTIVITY_ICONS: Record<string, IconName> = {
  LISTING_SUBMITTED: 'doc',
  LISTING_APPROVED: 'shieldcheck',
  LISTING_CHANGES_REQUESTED: 'edit',
  LISTING_REJECTED: 'x',
  LISTING_REMOVED: 'trash',
  REPORT_CREATED: 'flag',
  REPORT_RECEIVED: 'flag',
  SUPPORT_MESSAGE_SENT: 'mail',
  REPORT_RESOLVED: 'check',
  USER_SUSPENDED: 'lock',
  USER_ACTIVE: 'user',
  USER_REGISTERED: 'user',
  LOCATION_ADDED: 'map',
  LOCATION_EDITED: 'map',
  LOCATION_REMOVED: 'map',
};

const QUICK: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin/review', label: 'Review listings', icon: 'shieldcheck' },
  { to: '/admin/users', label: 'Manage users', icon: 'users' },
  { to: '/admin/reports', label: 'Reported properties', icon: 'flag' },
  { to: '/admin/locations', label: 'Locations', icon: 'map' },
];

const when = (iso: string) => `${formatDay(iso)}, ${formatTime(iso)}`;

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="grid h-12 w-14 flex-none place-items-center overflow-hidden rounded-md border border-line bg-surface text-muted">
      {url ? <img className="size-full object-cover" src={url} alt="" /> : <Icon name="image" />}
    </span>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, isError, refetch } = useAdminSummary();

  return (
    <main className="page" id="main">
      <div className="page-head items-center!">
        <div>
          <h1 className="t-page">{t('Administrator dashboard')}</h1>
          <p className="muted m-0">
            {t('Welcome back,')} {user?.fullName}
            {t('. Here is what needs checking in the UR-CST housing pilot.')}
          </p>
        </div>
        <Link className={buttonClass()} to="/admin/review">
          <Icon name="shieldcheck" />
          {t('Review listings')}
        </Link>
      </div>
      {isError ? (
        <ErrorState
          icon="wifi"
          title={t('Unable to load the dashboard.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      ) : !data ? (
        <div
          className="flex flex-col gap-4"
          role="status"
          aria-busy="true"
          aria-label={t('Loading the dashboard')}
        >
          <Skeleton height={120} />
          <Skeleton height={260} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-5 gap-4 max-[1279px]:grid-cols-3 max-tablet:grid-cols-2 max-phone:grid-cols-1">
            <StatCard
              to="/admin/review"
              label={t('Pending reviews')}
              value={data.counts.pending}
              hint={t('Waiting for a decision')}
              icon="clock"
            />
            <StatCard
              to="/admin/reports"
              label={t('Open reports')}
              value={data.counts.openReports}
              hint={t('From students')}
              icon="flag"
            />
            <StatCard
              to="/admin/review"
              label={t('Property listings')}
              value={data.counts.listings}
              hint={t('Submitted at least once')}
              icon="home"
            />
            <StatCard
              to="/admin/users"
              label={t('Student accounts')}
              value={data.counts.students}
              hint={t('Registered students')}
              icon="user"
            />
            <StatCard
              to="/admin/users"
              label={t('Landlords')}
              value={data.counts.landlords}
              hint={t('Registered landlords')}
              icon="building"
            />
          </div>
          <div className="grid grid-cols-1 gap-6 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <DashCard
              title={t('Needs your attention')}
              count={data.counts.pending + data.counts.openReports}
              intro={t('Listings waiting for review and open reports, oldest listings first.')}
            >
              {data.pending.length === 0 && data.reports.length === 0 ? (
                <p className="muted m-0 flex items-center gap-2">
                  <Icon name="check" />
                  {t('Nothing waiting. All listings and reports are handled.')}
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col p-0">
                  {data.pending.map(({ id, title, landlord, submittedAt, coverUrl }) => (
                    <li
                      key={id}
                      className="mini flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <Thumb url={coverUrl} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <b className="truncate">{tNode(title)}</b>
                        <span className="text-sm text-muted">
                          {tNode(landlord)}
                          {submittedAt && t(' · submitted {p0}', { p0: formatDate(submittedAt) })}
                        </span>
                      </span>
                      <Link
                        className={buttonClass({ size: 'sm' })}
                        to={`/admin/review/${id}`}
                        aria-label={t('Review {title}', { title })}
                      >
                        {t('Review')}
                      </Link>
                    </li>
                  ))}
                  {data.reports.map(({ id, title, reason, createdAt }) => (
                    <li
                      key={id}
                      className="mini flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <span className="grid h-12 w-14 flex-none place-items-center rounded-md bg-red-50 text-red-text">
                        <Icon name="flag" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <b className="truncate">
                          {t('Report:')} {tNode(title)}
                        </b>
                        <span className="text-sm text-muted">
                          {tNode(reason)} · {tNode(formatDate(createdAt))}
                        </span>
                      </span>
                      <Link
                        className={buttonClass({ variant: 'secondary', size: 'sm' })}
                        to="/admin/reports"
                        aria-label={t('Open the report on {title}', { title })}
                      >
                        {t('Open')}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashCard>
            <DashCard title={t('Recent activity')} intro={t('The latest actions on the platform.')}>
              {data.activity.length ? (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {data.activity.map(({ id, action, text, createdAt }) => (
                    <li key={id} className="flex items-start gap-3">
                      <span className="grid size-9 flex-none place-items-center rounded-full bg-blue-50 text-blue-700">
                        <Icon name={ACTIVITY_ICONS[action] ?? 'info'} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span>{tNode(text)}</span>
                        <span className="num text-sm text-muted">{tNode(when(createdAt))}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted m-0">{t('No activity yet.')}</p>
              )}
            </DashCard>
          </div>
          <DashCard title={t('Quick actions')}>
            <div className="grid grid-cols-4 gap-3 max-tablet:grid-cols-2 max-phone:grid-cols-1">
              {QUICK.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  className="flex min-h-14 items-center gap-3 rounded-md border border-line px-4 font-semibold text-ink no-underline transition-colors hover:border-blue hover:bg-blue-50"
                  to={to}
                >
                  <span className="grid size-9 place-items-center rounded-md bg-blue-50 text-blue-700">
                    <Icon name={icon} />
                  </span>
                  {tNode(label)}
                </Link>
              ))}
            </div>
          </DashCard>
        </div>
      )}
    </main>
  );
}
