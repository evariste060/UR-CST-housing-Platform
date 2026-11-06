import { Prisma } from '@prisma/client';
import type { ApiErrorBody } from '@urcst/shared';
import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notLoggedIn = () => new AppError(401, 'NOT_LOGGED_IN', 'Please log in to continue.');

export const accountSuspended = () =>
  new AppError(
    403,
    'ACCOUNT_SUSPENDED',
    'Your account has been suspended, so you cannot log in. Contact the platform team for help.',
  );

export const emailTaken = () =>
  new AppError(409, 'EMAIL_TAKEN', 'That email address is already in use.', {
    email: 'An account with this email already exists. Log in or use a different email.',
  });

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isMalformedJson(error: unknown): boolean {
  return (error as { type?: string } | null)?.type === 'entity.parse.failed';
}

// Express treats a four-argument function as the error handler, so `_next` must stay.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, fields: error.fields },
    };
    res.status(error.status).json(body);
    return;
  }

  if (isMalformedJson(error)) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'The request could not be read.' },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: 'SERVER_ERROR',
      message: 'Something went wrong on our side. Please try again.',
    },
  });
}
