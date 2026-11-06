import {
  DISTANCE_SLIDER,
  EMPTY_FILTERS,
  RENT_SLIDER,
  ROOM_TYPE_LABELS,
  searchFiltersSchema,
  sortSchema,
  type PropertySort,
  type SearchFilters,
} from '@urcst/shared';
import { formatNumber } from '../lib/format';

const FLAGS = ['water', 'electricity', 'privateBath', 'security', 'availableOnly'] as const;

/** Only what differs from the defaults, so links stay short and readable. */
export function filtersToParams(filters: SearchFilters, sort: PropertySort = 'recommended') {
  const params = new URLSearchParams();
  const { q, minRent, maxRent, maxDistance, types, layout, rooms } = filters;

  if (q) params.set('q', q);
  if (minRent !== undefined) params.set('minRent', String(minRent));
  if (maxRent !== undefined) params.set('maxRent', String(maxRent));
  if (maxDistance !== undefined) params.set('maxDistance', String(maxDistance));
  if (types.length) params.set('types', types.join(','));
  if (layout !== 'any') params.set('layout', layout);
  if (rooms !== 'any') params.set('rooms', rooms);
  for (const flag of FLAGS) if (filters[flag]) params.set(flag, 'true');
  if (sort !== 'recommended') params.set('sort', sort);
  return params;
}

/** Reads an address. A value someone edited by hand is ignored rather than breaking the page. */
export function filtersFromParams(params: URLSearchParams) {
  const raw = Object.fromEntries(params);
  const filters: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const field = searchFiltersSchema.shape[key as keyof SearchFilters];
    if (field?.safeParse(value).success) filters[key] = value;
  }
  const sort = sortSchema.safeParse(raw.sort);
  return {
    filters: searchFiltersSchema.parse(filters),
    sort: sort.success ? sort.data : ('recommended' as PropertySort),
  };
}

export function searchPath(filters: SearchFilters, sort?: PropertySort) {
  const params = filtersToParams(filters, sort).toString();
  return params ? `/search?${params}` : '/search';
}

export interface FilterChip {
  key: string;
  label: string;
}

export function filterChips(filters: SearchFilters): FilterChip[] {
  const { q, minRent, maxRent, maxDistance, types, layout, rooms } = filters;
  const chips: FilterChip[] = [];

  if (q) chips.push({ key: 'q', label: `Location: ${q}` });
  if (minRent !== undefined)
    chips.push({ key: 'minRent', label: `Min ${formatNumber(minRent)} RWF` });
  if (maxRent !== undefined)
    chips.push({ key: 'maxRent', label: `Max ${formatNumber(maxRent)} RWF` });
  if (maxDistance !== undefined) {
    chips.push({ key: 'maxDistance', label: `Within ${maxDistance} km` });
  }
  for (const type of types) chips.push({ key: `type:${type}`, label: ROOM_TYPE_LABELS[type] });
  if (layout !== 'any') {
    chips.push({
      key: 'layout',
      label: layout === 'self' ? 'Self-contained' : 'Shared facilities',
    });
  }
  if (filters.water) chips.push({ key: 'water', label: 'Water' });
  if (filters.electricity) chips.push({ key: 'electricity', label: 'Electricity' });
  if (filters.privateBath) chips.push({ key: 'privateBath', label: 'Private bathroom' });
  if (filters.security) chips.push({ key: 'security', label: 'Security' });
  if (rooms !== 'any') chips.push({ key: 'rooms', label: rooms === '2' ? '2+ rooms' : '1 room' });
  if (filters.availableOnly) chips.push({ key: 'availableOnly', label: 'Available only' });
  return chips;
}

export function removeChip(filters: SearchFilters, key: string): SearchFilters {
  if (key.startsWith('type:')) {
    const type = key.slice('type:'.length);
    return { ...filters, types: filters.types.filter((item) => item !== type) };
  }
  return { ...filters, [key]: EMPTY_FILTERS[key as keyof SearchFilters] };
}

export function searchLabel(filters: SearchFilters) {
  const chips = filterChips(filters).map(({ label }) => label);
  return chips.length ? chips.join(' · ') : 'All accommodation';
}

export const BUDGET_STEP = 30_000;
export const DISTANCE_STEP = 1;

/** The higher budget offered when nothing matches, or undefined at the top of the slider. */
export function nextBudget({ maxRent }: SearchFilters) {
  if (maxRent === undefined) return undefined;
  return Math.min(RENT_SLIDER.max, maxRent + BUDGET_STEP);
}

export function nextDistance({ maxDistance }: SearchFilters) {
  if (maxDistance === undefined) return undefined;
  return Math.min(DISTANCE_SLIDER.max, maxDistance + DISTANCE_STEP);
}

/** A filter at the end of its slider is the same as no filter. */
export function withBudget(filters: SearchFilters, maxRent: number): SearchFilters {
  return { ...filters, maxRent: maxRent >= RENT_SLIDER.max ? undefined : maxRent };
}

export function withDistance(filters: SearchFilters, maxDistance: number): SearchFilters {
  return { ...filters, maxDistance: maxDistance >= DISTANCE_SLIDER.max ? undefined : maxDistance };
}

export function withoutFacilityAndTypeFilters(filters: SearchFilters): SearchFilters {
  return {
    ...filters,
    types: [],
    layout: 'any',
    water: false,
    electricity: false,
    privateBath: false,
    security: false,
    rooms: 'any',
    availableOnly: false,
  };
}
