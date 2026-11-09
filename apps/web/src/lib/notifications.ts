import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationList } from '@urcst/shared';
import { useAuth } from '../auth/useAuth';
import type { IconName } from '../components/Icon';
import { api } from './api';

/** How many the bell shows. The page shows a full page of them. */
export const BELL_COUNT = 4;
const CHECK_EVERY_MS = 60_000;

const NOTIFICATIONS_KEY = ['notifications'];

const ICONS: Record<string, IconName> = {
  INQUIRY_RECEIVED: 'message',
  INQUIRY_REPLIED: 'message',
  LISTING_SUBMITTED: 'doc',
  LISTING_TO_REVIEW: 'doc',
  LISTING_APPROVED: 'shieldcheck',
  LISTING_CHANGES_REQUESTED: 'edit',
  LISTING_REJECTED: 'x',
  LISTING_REMOVED: 'trash',
  AVAILABILITY_CHANGED: 'door',
  NEW_LISTING: 'home',
  REPORT_RECEIVED: 'flag',
};

export function notificationIcon(type: string): IconName {
  return ICONS[type] ?? 'bell';
}

/** The signed-in person's notifications. Checks for new ones every minute. */
export function useNotifications(page = 1, pageSize = BELL_COUNT) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, user?.id, page, pageSize],
    queryFn: () => api.notifications(page, pageSize),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    refetchInterval: CHECK_EVERY_MS,
  });
}

export function useUnreadCount() {
  return useNotifications().data?.unreadCount ?? 0;
}

/** Marks as read straight away on screen, then tells the server. */
function useReadMutation(mutationFn: (id?: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (id?: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.setQueriesData<NotificationList>({ queryKey: NOTIFICATIONS_KEY }, (list) => {
        if (!list) return list;
        const items = list.items.map((item) =>
          id === undefined || item.id === id ? { ...item, read: true } : item,
        );
        const wasUnread = list.items.some((item) => item.id === id && !item.read);
        const unreadCount =
          id === undefined ? 0 : Math.max(0, list.unreadCount - (wasUnread ? 1 : 0));
        return { ...list, items, unreadCount };
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkRead() {
  return useReadMutation((id) => api.readNotification(id!));
}

export function useMarkAllRead() {
  return useReadMutation(() => api.readAllNotifications());
}
