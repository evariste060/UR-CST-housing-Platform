import { healthResponseSchema } from '@urcst/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('GET /api/health', () => {
  it('returns a valid ok response', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(res.body)).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('return the standard error shape', async () => {
    const res = await request(createApp()).get('/api/nothing-here');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'We could not find that page.' },
    });
  });
});
