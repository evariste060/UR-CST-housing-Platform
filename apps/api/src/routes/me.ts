import {
  changePasswordSchema,
  contactPreferencesSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type ContactPreferences,
  type UpdateProfileInput,
} from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { AppError, emailTaken, isUniqueViolation } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/passwords';
import { readSession, SESSION_COOKIE, startSession, toAuthUser } from '../lib/session';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.patch('/', validate(updateProfileSchema), async (req, res) => {
  const user = req.user!;
  const { fullName, email, phone } = req.body as UpdateProfileInput;

  if (user.role === 'LANDLORD' && phone === '') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
      phone: 'Enter a phone number with at least 9 digits.',
    });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { fullName, email, phone: phone === '' ? null : phone },
    });
    res.json({ user: toAuthUser(updated) });
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
});

meRouter.post('/password', validate(changePasswordSchema), async (req, res) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
      currentPassword: 'Current password is not correct.',
    });
  }

  // Bumping the version logs out other devices, so this one needs a new session.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });
  const session = readSession(req.cookies?.[SESSION_COOKIE]);

  startSession(res, updated, session?.remember ?? false);
  res.json({ ok: true });
});

meRouter.get('/contact-preferences', requireRole('LANDLORD'), async (req, res) => {
  const profile = await prisma.landlordProfile.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id },
    update: {},
  });
  const prefs: ContactPreferences = {
    allowPhone: profile.allowPhone,
    allowWhatsapp: profile.allowWhatsapp,
    allowInApp: profile.allowInApp,
  };
  res.json(prefs);
});

meRouter.patch(
  '/contact-preferences',
  requireRole('LANDLORD'),
  validate(contactPreferencesSchema),
  async (req, res) => {
    const prefs = req.body as ContactPreferences;
    const profile = await prisma.landlordProfile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...prefs },
      update: prefs,
    });

    res.json({
      allowPhone: profile.allowPhone,
      allowWhatsapp: profile.allowWhatsapp,
      allowInApp: profile.allowInApp,
    });
  },
);
