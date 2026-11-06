import { EMPTY_FILTERS } from '@urcst/shared';
import { describe, expect, it } from 'vitest';
import { parseSmartSearch } from './smartSearch';

const LOCATIONS = ['Kiyovu', 'Muhima', 'Nyamirambo'];
const parse = (text: string) => parseSmartSearch(text, LOCATIONS);

describe('parseSmartSearch', () => {
  it('understands the example from the spec', () => {
    expect(parse('Kiyovu single room under 100,000 within 2 km')).toEqual({
      ...EMPTY_FILTERS,
      q: 'Kiyovu',
      types: ['SINGLE'],
      maxRent: 100000,
      maxDistance: 2,
    });
  });

  it.each([
    ['under 80k', 80000],
    ['below 60', 60000],
    ['max 75,000', 75000],
    ['up to RWF 90000', 90000],
    ['less than 52,000', 50000],
  ])('reads the budget in "%s"', (text, maxRent) => {
    expect(parse(text).maxRent).toBe(maxRent);
  });

  it('does not read a distance as a budget', () => {
    expect(parse('under 2 km')).toMatchObject({ maxDistance: 2 });
    expect(parse('under 2 km').maxRent).toBeUndefined();
  });

  it('keeps "no limit" out of the filters', () => {
    expect(parse('under 900,000').maxRent).toBeUndefined();
    expect(parse('within 12 km').maxDistance).toBeUndefined();
  });

  it('reads facilities and availability', () => {
    expect(parse('self-contained with private bathroom, water, electricity, guard')).toMatchObject({
      layout: 'self',
      privateBath: true,
      water: true,
      electricity: true,
      security: true,
    });
    expect(parse('available rooms').availableOnly).toBe(true);
  });

  it('does not take "shared bathroom" to mean a shared room', () => {
    expect(parse('single room with shared bathroom').types).toEqual(['SINGLE']);
    expect(parse('shared room').types).toEqual(['SHARED']);
  });

  it('treats unknown text as a place to look for', () => {
    expect(parse('  Nyabugogo Bus Park ')).toEqual({ ...EMPTY_FILTERS, q: 'Nyabugogo Bus Park' });
  });

  it('ignores case in place names', () => {
    expect(parse('MUHIMA').q).toBe('Muhima');
  });
});
