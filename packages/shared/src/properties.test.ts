import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  propertyQuerySchema,
  reportSchema,
  searchFiltersSchema,
} from './properties';
import { inquirySchema, recordSearchSchema } from './student';

describe('propertyQuerySchema', () => {
  it('fills in the defaults', () => {
    expect(propertyQuerySchema.parse({})).toMatchObject({
      q: '',
      types: [],
      layout: 'any',
      rooms: 'any',
      sort: 'recommended',
      page: 1,
      pageSize: 20,
      availableOnly: false,
    });
  });

  it('reads the text of a query string', () => {
    const query = propertyQuerySchema.parse({
      maxRent: '100000',
      maxDistance: '1.5',
      types: 'SINGLE,STUDIO',
      water: 'true',
      security: 'false',
      ids: 'p1,p2',
    });

    expect(query).toMatchObject({
      maxRent: 100000,
      maxDistance: 1.5,
      types: ['SINGLE', 'STUDIO'],
      water: true,
      security: false,
      ids: ['p1', 'p2'],
    });
  });

  it('never returns more than 50 at a time', () => {
    expect(propertyQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(propertyQuerySchema.safeParse({ pageSize: '50' }).success).toBe(true);
  });

  it.each([
    [{ maxRent: 'lots' }],
    [{ maxRent: '1000.5' }],
    [{ maxDistance: '-1' }],
    [{ types: 'CASTLE' }],
    [{ sort: 'random' }],
    [{ layout: 'open' }],
    [{ rooms: '3' }],
  ])('rejects %j', (query) => {
    expect(propertyQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('search filters', () => {
  it('survive being saved as JSON', () => {
    const filters = searchFiltersSchema.parse({ q: 'Muhima', maxRent: 60000, types: ['SHARED'] });

    expect(searchFiltersSchema.parse(JSON.parse(JSON.stringify(filters)))).toEqual(filters);
  });

  it('accept the short form kept in seeded history', () => {
    expect(searchFiltersSchema.parse({ q: 'Muhima', maxRent: 60000 })).toEqual({
      ...EMPTY_FILTERS,
      q: 'Muhima',
      maxRent: 60000,
    });
  });
});

describe('student input', () => {
  it('needs at least 10 characters in a message', () => {
    expect(inquirySchema.safeParse({ message: '  long enough ' }).success).toBe(true);
    expect(inquirySchema.safeParse({ message: ' short ' }).success).toBe(false);
  });

  it('needs a reason from the list for a report', () => {
    expect(reportSchema.safeParse({ reason: 'SUSPICIOUS' }).success).toBe(true);
    expect(reportSchema.safeParse({ reason: 'BORED' }).success).toBe(false);
    expect(reportSchema.safeParse({}).success).toBe(false);
  });

  it('needs a label for a saved search', () => {
    expect(recordSearchSchema.safeParse({ label: '', filters: {} }).success).toBe(false);
    expect(recordSearchSchema.safeParse({ label: 'Kiyovu', filters: {} }).success).toBe(true);
  });
});
