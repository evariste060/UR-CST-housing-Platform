import type { SearchFilters } from '@urcst/shared';
import { EMPTY_FILTERS } from '@urcst/shared';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  landlordProfiles,
  locations,
  properties as seedProperties,
  users,
} from '../../prisma/seed/data';
import { prisma } from '../db';
import { clearDatabase, createTestApp } from '../test/helpers';

interface Listing {
  id: string;
  area: string;
  title: string;
  landmark: string;
  rent: number;
  dist: number;
  type: string;
  selfContained: boolean;
  water: boolean;
  electricity: boolean;
  bath: string;
  security: boolean;
  rooms: number;
  avail: string;
  review: string;
}

interface PrototypeFilters {
  q: string;
  min: number;
  max: number;
  dist: number;
  types: string[];
  self: string;
  water: boolean;
  electricity: boolean;
  privateBath: boolean;
  security: boolean;
  rooms: string;
  availOnly: boolean;
}

const DEFAULTS: PrototypeFilters = {
  q: '',
  min: 30000,
  max: 250000,
  dist: 5,
  types: [],
  self: 'any',
  water: false,
  electricity: false,
  privateBath: false,
  security: false,
  rooms: 'any',
  availOnly: false,
};

/** filterProps() from reference/prototype.html, with only its types added. */
function prototypeFilter(list: Listing[], overrides: Partial<PrototypeFilters>, sort: string) {
  const f = { ...DEFAULTS, ...overrides };
  const q = f.q.trim().toLowerCase();
  const found = list.filter(
    (p) =>
      p.review === 'approved' &&
      (!q ||
        p.area.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.landmark.toLowerCase().includes(q)) &&
      p.rent >= f.min &&
      p.rent <= f.max &&
      p.dist <= f.dist &&
      (!f.types.length || f.types.includes(p.type)) &&
      (f.self === 'any' || (f.self === 'self' ? p.selfContained : !p.selfContained)) &&
      (!f.water || p.water) &&
      (!f.electricity || p.electricity) &&
      (!f.privateBath || p.bath === 'private') &&
      (!f.security || p.security) &&
      (f.rooms === 'any' || (f.rooms === '2' ? p.rooms >= 2 : p.rooms === 1)) &&
      (!f.availOnly || p.avail === 'available'),
  );
  found.sort((a, b) =>
    sort === 'price-asc'
      ? a.rent - b.rent
      : sort === 'price-desc'
        ? b.rent - a.rent
        : sort === 'distance'
          ? a.dist - b.dist
          : a.avail === b.avail
            ? a.dist - b.dist
            : a.avail === 'available'
              ? -1
              : 1,
  );
  return found;
}

function toApiQuery(overrides: Partial<PrototypeFilters>, sort: string) {
  const f = { ...DEFAULTS, ...overrides };
  const filters: Partial<SearchFilters> = {
    q: f.q,
    water: f.water,
    electricity: f.electricity,
    privateBath: f.privateBath,
    security: f.security,
    availableOnly: f.availOnly,
  };
  return {
    ...EMPTY_FILTERS,
    ...filters,
    ...(f.min !== DEFAULTS.min && { minRent: f.min }),
    ...(f.max !== DEFAULTS.max && { maxRent: f.max }),
    ...(f.dist !== DEFAULTS.dist && { maxDistance: f.dist }),
    types: f.types.map((type) => type.toUpperCase()).join(','),
    layout: f.self,
    rooms: f.rooms,
    sort,
  };
}

const CASES: [string, Partial<PrototypeFilters>][] = [
  ['everything', {}],
  ['Journey A', { max: 100000, types: ['single'], dist: 2 }],
  ['a neighbourhood', { q: 'Muhima' }],
  ['a word in a title or landmark', { q: 'Kiyovu' }],
  ['a budget preset', { max: 50000 }],
  ['an exact range', { min: 60000, max: 120000 }],
  ['a distance preset', { dist: 1 }],
  ['an exact distance', { dist: 1.5 }],
  ['two room types', { types: ['shared', 'studio'] }],
  ['self-contained', { self: 'self' }],
  ['shared facilities', { self: 'shared' }],
  ['all four facilities', { water: true, electricity: true, privateBath: true, security: true }],
  ['2 or more rooms', { rooms: '2' }],
  ['1 room', { rooms: '1' }],
  ['available only', { availOnly: true }],
  ['nothing matches', { max: 30000, dist: 0.5, security: true }],
];

describe('search matches the prototype on the same data', () => {
  let listings: Listing[];
  const locationName = new Map(locations.map(({ id, name }) => [id, name]));

  beforeAll(async () => {
    await clearDatabase();
    await prisma.location.createMany({ data: locations });
    await prisma.user.createMany({
      data: users.map((user) => ({ ...user, passwordHash: 'not-used' })),
    });
    await prisma.landlordProfile.createMany({ data: landlordProfiles });
    await prisma.property.createMany({ data: seedProperties });

    listings = seedProperties.map((row) => ({
      id: row.id as string,
      area: locationName.get(row.locationId) as string,
      title: row.title,
      landmark: row.landmark,
      rent: row.rentRwf,
      dist: Number(row.distanceKm),
      type: row.type.toLowerCase(),
      selfContained: row.selfContained,
      water: row.water,
      electricity: row.electricity,
      bath: row.bathroom.toLowerCase(),
      security: row.security,
      rooms: row.rooms as number,
      avail: (row.availability as string).toLowerCase(),
      review: (row.reviewStatus as string).toLowerCase(),
    }));
  });

  it('has the 11 approved listings to test with', () => {
    expect(prototypeFilter(listings, {}, 'recommended')).toHaveLength(11);
  });

  it.each(CASES)('counts the same for %s', async (_name, filters) => {
    const { app } = createTestApp();

    const res = await request(app)
      .get('/api/properties')
      .query({ ...toApiQuery(filters, 'recommended'), pageSize: 50 });

    const expected = prototypeFilter(listings, filters, 'recommended');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(expected.length);
    expect(res.body.items.map(({ id }: { id: string }) => id).sort()).toEqual(
      expected.map(({ id }) => id).sort(),
    );
  });

  it.each(['recommended', 'price-asc', 'price-desc', 'distance'])(
    'sorts the same for %s',
    async (sort) => {
      const { app } = createTestApp();

      const res = await request(app)
        .get('/api/properties')
        .query({ ...toApiQuery({}, sort), pageSize: 50 });

      const value = (p: { rentRwf: number; distanceKm: number; availability: string }) =>
        sort.startsWith('price')
          ? p.rentRwf
          : sort === 'distance'
            ? p.distanceKm
            : `${p.availability === 'AVAILABLE' ? 0 : 1}-${p.distanceKm}`;
      const expected = prototypeFilter(listings, {}, sort).map((p) =>
        sort.startsWith('price')
          ? p.rent
          : sort === 'distance'
            ? p.dist
            : `${p.avail === 'available' ? 0 : 1}-${p.dist}`,
      );

      expect(res.body.items.map(value)).toEqual(expected);
    },
  );
});
