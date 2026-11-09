import { randomUUID } from 'node:crypto';
import {
  SUPPORT_TOPIC_LABELS,
  supportMessageSchema,
  type SupportMessageInput,
} from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';
import type { Mailer } from '../lib/mailer';
import { currentUser } from '../middleware/auth';
import { supportLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

/** Contact support. Guests can use it too. The message goes to the support team by email. */
export function supportRouter(mailer: Mailer) {
  const router = Router();

  router.post('/', supportLimiter(), validate(supportMessageSchema), async (req, res) => {
    const sender = await currentUser(req, res);
    const message = req.body as SupportMessageInput;

    await mailer.sendSupportMessage(message);
    await prisma.activityLog.create({
      data: {
        actorId: sender?.id,
        action: 'SUPPORT_MESSAGE_SENT',
        targetType: 'SupportMessage',
        targetId: randomUUID(),
        text: `${message.name} contacted support about ${SUPPORT_TOPIC_LABELS[message.topic].toLowerCase()}`,
      },
    });
    res.status(201).json({ ok: true });
  });

  return router;
}
