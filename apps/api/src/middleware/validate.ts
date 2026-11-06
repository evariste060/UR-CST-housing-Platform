import { toFieldErrors } from '@urcst/shared';
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors';

export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please check the highlighted fields.',
        toFieldErrors(result.error),
      );
    }

    req.body = result.data;
    next();
  };
}

/** For query strings. Express makes `req.query` read-only, so this returns the parsed values. */
export function parseQuery<T>(schema: ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please check the search filters.',
      toFieldErrors(result.error),
    );
  }
  return result.data;
}
