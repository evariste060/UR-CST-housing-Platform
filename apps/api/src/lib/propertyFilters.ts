import type { Prisma } from '@prisma/client';
import {
  FILTER_BUDGETS,
  FILTER_DISTANCES,
  roomTypeSchema,
  type FilterCounts,
  type PropertyQuery,
  type PropertySort,
} from '@urcst/shared';
import { prisma } from '../db';
import { PUBLIC_LISTING } from './propertyDto';

export function propertyWhere(query: PropertyQuery): Prisma.PropertyWhereInput {
  const { q, minRent, maxRent, maxDistance, types, layout, rooms } = query;
  const contains = { contains: q, mode: 'insensitive' } as const;

  return {
    ...PUBLIC_LISTING,
    ...(query.ids && { id: { in: query.ids } }),
    ...(query.locationId && { locationId: query.locationId }),
    ...(q && {
      OR: [{ location: { name: contains } }, { title: contains }, { landmark: contains }],
    }),
    rentRwf: { gte: minRent, lte: maxRent },
    ...(maxDistance !== undefined && { distanceKm: { lte: maxDistance } }),
    ...(types.length > 0 && { type: { in: types } }),
    ...(layout !== 'any' && { selfContained: layout === 'self' }),
    ...(query.water && { water: true }),
    ...(query.electricity && { electricity: true }),
    ...(query.privateBath && { bathroom: 'PRIVATE' }),
    ...(query.security && { security: true }),
    ...(rooms === '1' && { rooms: 1 }),
    ...(rooms === '2' && { rooms: { gte: 2 } }),
    ...(query.availableOnly && { availability: 'AVAILABLE' }),
  };
}

// The id keeps the order the same from page to page when two listings tie.
const ORDER: Record<PropertySort, Prisma.PropertyOrderByWithRelationInput[]> = {
  // AVAILABLE is declared first in the enum, so ascending puts available rooms first.
  recommended: [{ availability: 'asc' }, { distanceKm: 'asc' }, { id: 'asc' }],
  'price-asc': [{ rentRwf: 'asc' }, { id: 'asc' }],
  'price-desc': [{ rentRwf: 'desc' }, { id: 'asc' }],
  distance: [{ distanceKm: 'asc' }, { id: 'asc' }],
};

export const propertyOrder = (sort: PropertySort) => ORDER[sort];

type Option = [key: string, change: Partial<PropertyQuery>];

/**
 * Counts what each filter option would show alongside the visitor's other choices. Each one runs
 * through propertyWhere, so a count can never disagree with the results.
 */
export async function filterCounts(query: PropertyQuery, areas: string[]): Promise<FilterCounts> {
  async function tally(options: Option[]) {
    const counts = await Promise.all(
      options.map(([, change]) =>
        prisma.property.count({ where: propertyWhere({ ...query, ...change }) }),
      ),
    );
    return Object.fromEntries(options.map(([key], index) => [key, counts[index] as number]));
  }

  const noBudget = { minRent: undefined, maxRent: undefined };
  const [areaCounts, budgets, distances, types, layouts, facilities, rooms, availability] =
    await Promise.all([
      tally([['', { q: '' }], ...areas.map((q): Option => [q, { q }])]),
      tally([
        ['any', noBudget],
        ...FILTER_BUDGETS.map((maxRent): Option => [String(maxRent), { ...noBudget, maxRent }]),
      ]),
      tally([
        ['any', { maxDistance: undefined }],
        ...FILTER_DISTANCES.map((maxDistance): Option => [String(maxDistance), { maxDistance }]),
      ]),
      tally(roomTypeSchema.options.map((type): Option => [type, { types: [type] }])),
      tally([
        ['any', { layout: 'any' }],
        ['self', { layout: 'self' }],
        ['shared', { layout: 'shared' }],
      ]),
      tally([
        ['water', { water: true }],
        ['electricity', { electricity: true }],
        ['privateBath', { privateBath: true }],
        ['security', { security: true }],
      ]),
      tally([
        ['any', { rooms: 'any' }],
        ['1', { rooms: '1' }],
        ['2', { rooms: '2' }],
      ]),
      tally([
        ['all', { availableOnly: false }],
        ['available', { availableOnly: true }],
      ]),
    ]);

  return { areas: areaCounts, budgets, distances, types, layouts, facilities, rooms, availability };
}
