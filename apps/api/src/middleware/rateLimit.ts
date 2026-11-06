import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors';

const WINDOW_MS = 15 * 60 * 1000;

const tooManyAttempts = new AppError(
  429,
  'TOO_MANY_ATTEMPTS',
  'Too many attempts. Please wait a few minutes and try again.',
);

// Created per app, so each test gets fresh counters.
export function loginLimiter() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => next(tooManyAttempts),
  });
}

export function forgotPasswordLimiter() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(tooManyAttempts),
  });
}
