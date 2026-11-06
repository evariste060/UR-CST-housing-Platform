import type { User } from '@prisma/client';
import type { Role } from '@urcst/shared';
import type { Request, RequestHandler, Response } from 'express';
import { prisma } from '../db';
import { accountSuspended, AppError, notLoggedIn } from '../lib/errors';
import { endSession, readSession, SESSION_COOKIE } from '../lib/session';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

/**
 * Checks the database on every request, so suspending someone or changing a password
 * takes effect at once instead of when the token expires.
 */
export async function currentUser(req: Request, res: Response): Promise<User | null> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const session = readSession(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });

  if (!user || user.tokenVersion !== session.tokenVersion) {
    endSession(res);
    return null;
  }
  if (user.status === 'SUSPENDED') {
    endSession(res);
    throw accountSuspended();
  }
  return user;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const user = await currentUser(req, res);
  if (!user) throw notLoggedIn();

  req.user = user;
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw notLoggedIn();
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Your account cannot do this.');
    }
    next();
  };
}
