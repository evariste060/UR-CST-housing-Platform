import type { Prisma } from '@prisma/client';
import type { NotificationType } from '@urcst/shared';

type Tx = Prisma.TransactionClient;

interface Message {
  type: NotificationType;
  text: string;
  link: string;
}

/** How long a landlord has to press Undo on an availability change. */
export const UNDO_WINDOW_MS = 60_000;

export async function notifyUsers(tx: Tx, userIds: string[], message: Message) {
  if (userIds.length === 0) return;
  await tx.notification.createMany({ data: userIds.map((userId) => ({ userId, ...message })) });
}

export async function notifyAdmins(tx: Tx, message: Message) {
  const admins = await tx.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  await notifyUsers(
    tx,
    admins.map(({ id }) => id),
    message,
  );
}

/**
 * Tells students who saved a listing that its availability changed. A second change inside
 * the Undo window can only put the first one back (there are two values), so it takes the
 * first notice away instead of sending another.
 */
export async function notifyAvailabilityChange(
  tx: Tx,
  property: { id: string; title: string; availability: 'AVAILABLE' | 'OCCUPIED' },
) {
  const link = `/properties/${property.id}`;
  const { count } = await tx.notification.deleteMany({
    where: {
      type: 'AVAILABILITY_CHANGED',
      link,
      createdAt: { gte: new Date(Date.now() - UNDO_WINDOW_MS) },
    },
  });
  if (count > 0) return;

  const savers = await tx.savedProperty.findMany({
    where: { propertyId: property.id },
    select: { userId: true },
  });
  const now = property.availability === 'AVAILABLE' ? 'available again' : 'occupied';
  await notifyUsers(
    tx,
    savers.map(({ userId }) => userId),
    {
      type: 'AVAILABILITY_CHANGED',
      text: `Availability changed: ${property.title} is now ${now}.`,
      link,
    },
  );
}
