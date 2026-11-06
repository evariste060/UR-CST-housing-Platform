import { createHash, randomBytes } from 'node:crypto';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { env } from '../env';
import { accountSuspended, AppError, emailTaken, isUniqueViolation } from '../lib/errors';
import type { Mailer } from '../lib/mailer';
import { hashPassword, verifyPassword } from '../lib/passwords';
import { endSession, startSession, toAuthUser } from '../lib/session';
import { currentUser } from '../middleware/auth';
import { forgotPasswordLimiter, loginLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const RESET_LINK_LIFETIME_MS = 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const invalidResetLink = () =>
  new AppError(400, 'INVALID_RESET_LINK', 'This reset link has expired or was already used.');

export function authRouter(mailer: Mailer) {
  const router = Router();

  router.post('/register', validate(registerSchema), async (req, res) => {
    const { role, fullName, email, phone, password } = req.body as RegisterInput;
    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            role,
            fullName,
            email,
            phone: phone ?? null,
            passwordHash,
            landlordProfile: role === 'LANDLORD' ? { create: {} } : undefined,
          },
        });
        await tx.activityLog.create({
          data: {
            actorId: created.id,
            action: 'USER_REGISTERED',
            targetType: 'User',
            targetId: created.id,
            text: `${fullName} registered as a ${role.toLowerCase()}`,
          },
        });
        return created;
      });

      startSession(res, user, false);
      res.status(201).json({ user: toAuthUser(user) });
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTaken();
      throw error;
    }
  });

  router.post('/login', loginLimiter(), validate(loginSchema), async (req, res) => {
    const { email, password, remember } = req.body as LoginInput;
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await verifyPassword(password, user?.passwordHash);

    if (!user || !passwordMatches) {
      throw new AppError(401, 'INVALID_LOGIN', 'The email or password is not correct.');
    }
    // Checked after the password, so a wrong password never reveals a suspended account.
    if (user.status === 'SUSPENDED') throw accountSuspended();

    startSession(res, user, remember ?? false);
    res.json({ user: toAuthUser(user) });
  });

  router.post('/logout', (_req, res) => {
    endSession(res);
    res.json({ ok: true });
  });

  router.get('/me', async (req, res) => {
    try {
      const user = await currentUser(req, res);
      res.json({ user: user ? toAuthUser(user) : null });
    } catch (error) {
      if (error instanceof AppError && error.code === 'ACCOUNT_SUSPENDED') {
        res.json({ user: null });
        return;
      }
      throw error;
    }
  });

  router.post(
    '/forgot-password',
    forgotPasswordLimiter(),
    validate(forgotPasswordSchema),
    async (req, res) => {
      const { email } = req.body as ForgotPasswordInput;
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        const token = randomBytes(32).toString('hex');

        await prisma.$transaction([
          prisma.passwordReset.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
          }),
          prisma.passwordReset.create({
            data: {
              userId: user.id,
              tokenHash: hashToken(token),
              expiresAt: new Date(Date.now() + RESET_LINK_LIFETIME_MS),
            },
          }),
        ]);

        const link = `${env.WEB_ORIGIN}/reset-password?token=${token}`;
        await mailer.sendPasswordReset(user.email, link);
      }

      res.json({
        message: 'If an account exists for that email, we have sent a link to reset the password.',
      });
    },
  );

  router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
    const { token, password } = req.body as ResetPasswordInput;
    const passwordHash = await hashPassword(password);
    const tokenHash = hashToken(token);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash } });
      if (!reset || reset.expiresAt <= now) throw invalidResetLink();

      // Only one request can claim the link, even if two arrive together.
      const claimed = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw invalidResetLink();

      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
    });

    res.json({ ok: true });
  });

  return router;
}
