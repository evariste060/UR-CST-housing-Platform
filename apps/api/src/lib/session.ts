import type { User } from '@prisma/client';
import type { AuthUser } from '@urcst/shared';
import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export const SESSION_COOKIE = 'urcst_session';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REMEMBER_MS = 30 * ONE_DAY_MS;

interface SessionPayload {
  sub: string;
  tokenVersion: number;
  remember: boolean;
}

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export function startSession(res: Response, user: User, remember: boolean) {
  const payload: SessionPayload = { sub: user.id, tokenVersion: user.tokenVersion, remember };
  const lifetimeMs = remember ? REMEMBER_MS : ONE_DAY_MS;
  const token = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: Math.floor(lifetimeMs / 1000),
  });

  // Without maxAge this is a browser-session cookie, so it ends when the browser closes.
  res.cookie(
    SESSION_COOKIE,
    token,
    remember ? { ...cookieOptions, maxAge: lifetimeMs } : cookieOptions,
  );
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

export function readSession(token: unknown): SessionPayload | null {
  if (typeof token !== 'string') return null;
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function toAuthUser({ id, email, fullName, phone, role }: User): AuthUser {
  return { id, email, fullName, phone, role };
}
