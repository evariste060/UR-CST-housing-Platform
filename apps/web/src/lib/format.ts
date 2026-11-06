import { ROOM_TYPE_LABELS, type PropertySummary } from '@urcst/shared';
import type { IconName } from '../components/Icon';
import type { PropertyCardData } from '../components/PropertyCard';

export const formatNumber = (amount: number) => amount.toLocaleString('en-US');
export const formatRwf = (amount: number) => `${formatNumber(amount)} RWF`;

/** Dates in history and messages are shown in Kigali time. */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Kigali',
  });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

export function typeLabel({ type, rooms }: Pick<PropertySummary, 'type' | 'rooms'>) {
  const label = ROOM_TYPE_LABELS[type];
  return type === 'APARTMENT' ? `${label} (${rooms} rooms)` : label;
}

export const layoutLabel = ({ selfContained }: Pick<PropertySummary, 'selfContained'>) =>
  selfContained ? 'Self-contained' : 'Shared facilities';

export function facilityChips(property: PropertySummary) {
  const { bathroom, water, electricity, security } = property;
  const chips: { label: string; icon: IconName }[] = [
    {
      label: bathroom === 'PRIVATE' ? 'Private bathroom' : 'Shared bathroom',
      icon: 'bath',
    },
  ];
  if (water && electricity) chips.push({ label: 'Water + electricity', icon: 'bolt' });
  else if (water) chips.push({ label: 'Water only', icon: 'water' });
  if (security) chips.push({ label: 'Security', icon: 'shield' });
  return chips.slice(0, 3);
}

/** Distances always show one decimal, such as 1.0 km. */
export const formatKm = (km: number) => `${km.toFixed(1)} km`;

/** What Listen says for a listing. */
export function spokenSummary(property: PropertySummary) {
  const { title, rentRwf, distanceKm, availability, bathroom } = property;
  return [
    `${title}.`,
    `${formatNumber(rentRwf)} RWF per month.`,
    `${formatKm(distanceKm)} from UR-CST.`,
    `${availability === 'AVAILABLE' ? 'Available now' : 'Currently occupied'}.`,
    `${typeLabel(property)}, ${layoutLabel(property).toLowerCase()}.`,
    `${bathroom === 'PRIVATE' ? 'Private bathroom' : 'Shared bathroom'}.`,
    `Water ${property.water ? 'included' : 'not included'}.`,
    `Electricity ${property.electricity ? 'included' : 'not included'}.`,
    property.security ? 'Has security.' : 'No security guard.',
  ].join(' ');
}

export function toCardData(property: PropertySummary): PropertyCardData {
  return {
    id: property.id,
    title: property.title,
    rent: property.rentRwf,
    distanceKm: property.distanceKm,
    availability: property.availability,
    typeLabel: typeLabel(property),
    layoutLabel: layoutLabel(property),
    area: property.area,
    photo: property.coverUrl ?? '',
    facilities: facilityChips(property),
    spokenSummary: spokenSummary(property),
  };
}
