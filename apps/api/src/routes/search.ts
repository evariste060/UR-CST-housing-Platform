import { searchParseSchema, type SearchParseInput } from '@urcst/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { parseSmartSearch } from '../lib/smartSearch';
import { validate } from '../middleware/validate';

export const searchRouter = Router();

searchRouter.post('/parse', validate(searchParseSchema), async (req, res) => {
  const { text } = req.body as SearchParseInput;
  const locations = await prisma.location.findMany({ select: { name: true } });
  const names = locations.map(({ name }) => name);

  res.json({ filters: parseSmartSearch(text, names) });
});
