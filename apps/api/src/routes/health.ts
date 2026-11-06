import type { HealthResponse } from '@urcst/shared';
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body: HealthResponse = { status: 'ok' };
  res.json(body);
});
