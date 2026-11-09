import type { Notification } from '@prisma/client';
import {
  notificationQuerySchema,
  type NotificationItem,
  type NotificationList,
  type UnreadCount,
} from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { AppError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { parseQuery } from '../middleware/validate';

function toItem({ id, type, text, link, readAt, createdAt }: Notification): NotificationItem {
  return { id, type, text, link, read: readAt !== null, createdAt: createdAt.toISOString() };
}

const unreadCount = (userId: string) =>
  prisma.notification.count({ where: { userId, readAt: null } });

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const { page, pageSize } = parseQuery(notificationQuerySchema, req.query);
  const userId = req.user!.id;

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
    unreadCount(userId),
  ]);

  const body: NotificationList = {
    items: rows.map(toItem),
    total,
    page,
    pageSize,
    unreadCount: unread,
  };
  res.json(body);
});

notificationsRouter.post('/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  const body: UnreadCount = { unreadCount: 0 };
  res.json(body);
});

notificationsRouter.post('/:id/read', async (req, res) => {
  const userId = req.user!.id;
  // Someone else's notification answers the same as a missing one.
  const found = await prisma.notification.findFirst({ where: { id: req.params.id, userId } });
  if (!found) {
    throw new AppError(404, 'NOT_FOUND', 'This notification could not be found.');
  }
  if (!found.readAt) {
    await prisma.notification.update({ where: { id: found.id }, data: { readAt: new Date() } });
  }
  const body: UnreadCount = { unreadCount: await unreadCount(userId) };
  res.json(body);
});
