import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { NotificationRow } from '../components/NotificationBell';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { useMarkAllRead, useNotifications } from '../lib/notifications';
import { t } from '../i18n';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { user, isPending: checking } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isError, refetch } = useNotifications(page, PAGE_SIZE);
  const markAll = useMarkAllRead();
  const toast = useToast();
  const unread = data?.unreadCount ?? 0;

  if (!checking && !user) {
    return (
      <main className="page" id="main">
        <div className="state narrow">
          <span className="state-ic">
            <Icon name="lock" />
          </span>
          <h1 className="state-title">{t('Log in to see your notifications')}</h1>
          <p>{t('Notifications tell you about replies, listings and rooms you saved.')}</p>
          <Link className={buttonClass()} to="/login">
            {t('Go to login')}
          </Link>
        </div>
      </main>
    );
  }

  function readAll() {
    markAll.mutate(undefined, {
      onSuccess: () => toast('All notifications marked as read.'),
      onError: () => toast('We could not mark them as read. Please try again.', { type: 'error' }),
    });
  }

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load your notifications.')}
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
          aria-label={t('Loading notifications')}
        >
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      );
    }
    if (data.total === 0) {
      return (
        <EmptyState
          icon="bell"
          title={t('No notifications')}
          text={t('Updates about your listings and inquiries will appear here.')}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <section
          className="overflow-hidden rounded-lg border border-line bg-card"
          aria-label={t('Your notifications')}
        >
          {data.items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </section>
        {data.total > PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            noun={t('notifications')}
            label={t('Notification pages')}
            onChange={(next) => setParams(next === 1 ? {} : { page: String(next) })}
          />
        )}
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Notifications')}</h1>
          <p className="muted m-0">
            {data &&
              (unread > 0 ? t('{unread} unread. ', { unread }) : t("You're all caught up. "))}
            {t('Select a notification to open the related page.')}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" icon="check" onClick={readAll}>
            {t('Mark all as read')}
          </Button>
        )}
      </div>
      {content()}
    </main>
  );
}
