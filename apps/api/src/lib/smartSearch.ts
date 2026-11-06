import {
  DISTANCE_SLIDER,
  EMPTY_FILTERS,
  RENT_SLIDER,
  type RoomType,
  type SearchFilters,
} from '@urcst/shared';

const THOUSAND = 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseMaxRent(text: string) {
  const match = text.match(
    /(?:under|below|max(?:imum)?|up to|less than|<)\s*(?:rwf\s*)?(\d[\d,.]*)\s*(k\b)?(?!\s*km)/,
  );
  if (!match?.[1]) return undefined;

  const amount = parseFloat(match[1].replace(/,/g, ''));
  const rwf = match[2] || amount < THOUSAND ? amount * THOUSAND : amount;
  const { min, max, step } = RENT_SLIDER;
  return clamp(Math.round(rwf / step) * step, min, max);
}

function parseDistance(text: string) {
  const match = text.match(/([\d.]+)\s*km/);
  if (!match?.[1]) return undefined;
  return clamp(parseFloat(match[1]), DISTANCE_SLIDER.min, DISTANCE_SLIDER.max);
}

function parseTypes(text: string) {
  const types: RoomType[] = [];
  if (/\bsingle\b/.test(text)) types.push('SINGLE');
  if (/\bshared?\b|\bsharing\b/.test(text) && !/shared (bath|facil|kitchen)/.test(text)) {
    types.push('SHARED');
  }
  if (text.includes('studio')) types.push('STUDIO');
  if (/apartment|flat\b/.test(text)) types.push('APARTMENT');
  return types;
}

/** Turns "Kiyovu single room under 100,000 within 2 km" into filters. */
export function parseSmartSearch(input: string, locationNames: string[]): SearchFilters {
  const text = input.toLowerCase();
  const location = locationNames.find((name) => text.includes(name.toLowerCase()));
  const maxRent = parseMaxRent(text);
  const maxDistance = parseDistance(text);

  const filters: SearchFilters = {
    ...EMPTY_FILTERS,
    q: location ?? '',
    types: parseTypes(text),
    layout: /self[- ]?contained/.test(text) ? 'self' : 'any',
    privateBath: text.includes('private bath'),
    security: /security|guard/.test(text),
    water: text.includes('water'),
    electricity: text.includes('electric'),
    availableOnly: text.includes('available'),
  };
  // The top of each slider means "no limit", so it is left out.
  if (maxRent !== undefined && maxRent < RENT_SLIDER.max) filters.maxRent = maxRent;
  if (maxDistance !== undefined && maxDistance < DISTANCE_SLIDER.max) {
    filters.maxDistance = maxDistance;
  }

  const understood =
    location ||
    maxRent !== undefined ||
    maxDistance !== undefined ||
    filters.types.length > 0 ||
    filters.layout !== 'any' ||
    filters.privateBath ||
    filters.security ||
    filters.water ||
    filters.electricity ||
    filters.availableOnly;

  // Anything else is treated as a place to look for.
  if (!understood) filters.q = input.trim();
  return filters;
}
