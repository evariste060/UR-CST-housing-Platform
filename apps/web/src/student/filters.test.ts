import { EMPTY_FILTERS, RENT_SLIDER, type SearchFilters } from '@urcst/shared';
import { describe, expect, it } from 'vitest';
import {
  filterChips,
  filtersFromParams,
  filtersToParams,
  nextBudget,
  nextDistance,
  removeChip,
  searchLabel,
  searchPath,
  withBudget,
  withoutFacilityAndTypeFilters,
} from './filters';

const filters: SearchFilters = {
  ...EMPTY_FILTERS,
  q: 'Kiyovu',
  maxRent: 100_000,
  maxDistance: 2,
  types: ['SINGLE', 'STUDIO'],
  water: true,
};

describe('filters in the address', () => {
  it('reads back what it wrote', () => {
    expect(filtersFromParams(filtersToParams(filters, 'distance'))).toEqual({
      filters,
      sort: 'distance',
    });
  });

  it('keeps the address short when nothing is chosen', () => {
    expect(searchPath(EMPTY_FILTERS)).toBe('/search');
  });

  it('ignores values edited by hand', () => {
    const params = new URLSearchParams('maxRent=lots&types=CASTLE&sort=random&q=Muhima');

    expect(filtersFromParams(params)).toEqual({
      filters: { ...EMPTY_FILTERS, q: 'Muhima' },
      sort: 'recommended',
    });
  });
});

describe('applied filter chips', () => {
  it('names every filter in plain words', () => {
    expect(filterChips(filters).map(({ label }) => label)).toEqual([
      'Location: Kiyovu',
      'Max 100,000 RWF',
      'Within 2 km',
      'Single room',
      'Studio',
      'Water',
    ]);
  });

  it('removes one filter at a time', () => {
    expect(removeChip(filters, 'water').water).toBe(false);
    expect(removeChip(filters, 'maxRent').maxRent).toBeUndefined();
    expect(removeChip(filters, 'type:SINGLE').types).toEqual(['STUDIO']);
  });

  it('labels a search with no filters', () => {
    expect(searchLabel(EMPTY_FILTERS)).toBe('All accommodation');
  });
});

describe('empty state suggestions', () => {
  it('offers the next step up', () => {
    expect(nextBudget(filters)).toBe(130_000);
    expect(nextDistance(filters)).toBe(3);
  });

  it('offers nothing for a filter that is not set', () => {
    expect(nextBudget(EMPTY_FILTERS)).toBeUndefined();
    expect(nextDistance(EMPTY_FILTERS)).toBeUndefined();
  });

  it('treats the end of the slider as no limit', () => {
    expect(withBudget(filters, RENT_SLIDER.max).maxRent).toBeUndefined();
  });

  it('removes facility and type filters but keeps budget and place', () => {
    expect(withoutFacilityAndTypeFilters(filters)).toEqual({
      ...EMPTY_FILTERS,
      q: 'Kiyovu',
      maxRent: 100_000,
      maxDistance: 2,
    });
  });
});
