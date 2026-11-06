import type { Prisma } from '@prisma/client';
import type { PropertyQuery, PropertySort } from '@urcst/shared';
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
