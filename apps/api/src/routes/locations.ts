import type { LocationDto } from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';

export const locationsRouter = Router();

locationsRouter.get('/', async (_req, res) => {
  const rows = await prisma.location.findMany({ orderBy: { distanceKm: 'asc' } });
  const items: LocationDto[] = rows.map(({ id, name, distanceKm, angleDeg }) => ({
    id,
    name,
    distanceKm: distanceKm.toNumber(),
    angleDeg,
  }));
  res.json({ items });
});
