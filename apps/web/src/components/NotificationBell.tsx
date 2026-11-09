import type { NotificationItem } from '@urcst/shared';
import { Link } from 'react-router-dom';
import { formatDay, formatTime } from '../lib/format';
import {
  notificationIcon,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '../lib/notifications';
import { HeaderMenu } from './HeaderMenus';
import { Icon } from './Icon';
import { Skeleton } from './StateBlocks';
import { t, tNode } from '../i18n';

/** One notification. Opening it marks it read and goes to the page it is about. */
export function NotificationRow({ item, onOpen }: { item: NotificationItem; onOpen?: () => void }) {
  const markRead = useMarkRead();
  const { id, text, link, read, type, createdAt } = item;

  return (
    <Link
      className={`notif flex items-start gap-3 border-b border-line px-4 py-3.5 text-ink no-underline transition-colors last:border-b-0 hover:bg-surface ${read ? 'bg-card' : 'unread bg-blue-50 hover:bg-blue-100'}`}
      to={link}
      onClick={() => {
        if (!read) markRead.mutate(id);
        onOpen?.();
      }}
    >
      <span className="grid size-10 flex-none place-items-center rounded-md bg-blue-50 text-blue-700 [.unread_&]:bg-card">
        <Icon name={notificationIcon(type)} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={read ? undefined : 'font-semibold'}>{tNode(text)}</span>
        <span className="num text-sm text-muted">
          {tNode(formatDay(createdAt))}, {tNode(formatTime(createdAt))}
        </span>
      </span>
      {!read && (
        <span className="flex flex-none items-center gap-1.5 pt-0.5 text-sm font-semibold text-blue-700">
          <span className="size-2.5 rounded-full bg-blue-700" aria-hidden="true" />
          {t('Unread')}
        </span>
      )}
    </Link>
  );
}

/** The bell in the header: the unread count, the latest few and a link to them all. */
export function NotificationBell({
  buttonClass,
  open,
  onOpenChange,
}: {
  buttonClass: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isError } = useNotifications();
  const markAll = useMarkAllRead();
  const unread = data?.unreadCount ?? 0;
  // Kept safe for a reply without a list, such as a stubbed API in tests.
  const items = data?.items ?? [];
  const close = () => onOpenChange(false);

  return (
    <HeaderMenu
      id="notifications"
      label={t('Notifications')}
      buttonClass={`${buttonClass} relative`}
      panelClass="w-[400px] max-w-[calc(100vw-1.5rem)] gap-0! overflow-hidden p-0! max-phone:fixed! max-phone:inset-x-3! max-phone:top-[calc(var(--hh,4.5rem)+0.5rem)]! max-phone:w-auto! max-phone:max-w-none!"
      button={
        <>
          <Icon name="bell" />
          <span className="sr-only">
            {t('Notifications')}
            {unread > 0 ? t(', {unread} unread', { unread }) : ''}
          </span>
          {unread > 0 && (
            <span className="count-pill absolute -top-0.5 -right-0.5" aria-hidden="true">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4">
        <b>{t('Notifications')}</b>
        {unread > 0 && (
          <button
            type="button"
            className="min-h-11 cursor-pointer border-0 bg-transparent px-1 font-semibold text-blue-700 hover:underline"
            onClick={() => markAll.mutate(undefined)}
          >
            {t('Mark all as read')}
          </button>
        )}
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {isError ? (
          <p className="m-0 p-4 text-muted">
            {t('Unable to load your notifications. Check your connection, then try again.')}
          </p>
        ) : !data ? (
          <div
            className="flex flex-col gap-2 p-4"
            role="status"
            aria-label={t('Loading notifications')}
          >
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        ) : items.length ? (
          items.map((item) => <NotificationRow key={item.id} item={item} onOpen={close} />)
        ) : (
          <p className="m-0 p-4 text-muted">{t('No notifications yet.')}</p>
        )}
      </div>
      <Link
        className="flex min-h-12 items-center justify-center gap-1 border-t border-line font-semibold text-blue-700"
        to="/notifications"
        onClick={close}
      >
        {t('See all notifications')}
        <Icon name="arrowR" />
      </Link>
    </HeaderMenu>
  );
}
