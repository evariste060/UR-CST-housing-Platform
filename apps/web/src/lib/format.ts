import { ROOM_TYPE_LABELS, type PropertySummary } from '@urcst/shared';
import type { IconName } from '../components/Icon';
import type { PropertyCardData } from '../components/PropertyCard';
import { locale, t } from '../i18n';

export const formatNumber = (amount: number) =>
  amount.toLocaleString(locale() === 'en-GB' ? 'en-US' : locale());
export const formatRwf = (amount: number) => `${formatNumber(amount)} RWF`;

/** Dates in history and messages are shown in Kigali time. */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale(), {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Kigali',
  });
}

const KIGALI = 'Africa/Kigali';
const dayKey = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: KIGALI });
const DAY_MS = 24 * 60 * 60 * 1000;

function relativeDay(iso: string, now: Date) {
  const day = dayKey(new Date(iso));
  if (day === dayKey(now)) return t('Today');
  if (day === dayKey(new Date(now.getTime() - DAY_MS))) return t('Yesterday');
  return null;
}

/** A clock time such as "10:24 AM", in Kigali time. */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(locale() === 'en-GB' ? 'en-US' : locale(), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: KIGALI,
  });
}

/** For lists: the time today, "Yesterday", or the date. */
export function formatWhen(iso: string, now = new Date()) {
  const day = relativeDay(iso, now);
  if (day === t('Today')) return formatTime(iso);
  return day ?? formatDate(iso);
}

/** For the line between messages: "Today", "Yesterday" or the full date. */
export function formatDay(iso: string, now = new Date()) {
  return (
    relativeDay(iso, now) ??
    new Date(iso).toLocaleDateString(locale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: KIGALI,
    })
  );
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
  const label = t(ROOM_TYPE_LABELS[type]);
  return type === 'APARTMENT' ? t('{label} ({rooms} rooms)', { label, rooms }) : label;
}

export const layoutLabel = ({ selfContained }: Pick<PropertySummary, 'selfContained'>) =>
  t(selfContained ? 'Self-contained' : 'Shared facilities');

export function facilityChips(property: PropertySummary) {
  const { bathroom, water, electricity, security } = property;
  const chips: { label: string; icon: IconName }[] = [
    {
      label: t(bathroom === 'PRIVATE' ? 'Private bathroom' : 'Shared bathroom'),
      icon: 'bath',
    },
  ];
  if (water && electricity) chips.push({ label: t('Water + electricity'), icon: 'bolt' });
  else if (water) chips.push({ label: t('Water only'), icon: 'water' });
  if (security) chips.push({ label: t('Security'), icon: 'shield' });
  return chips.slice(0, 3);
}

/** Distances always show one decimal, such as 1.0 km. */
export const formatKm = (km: number) => `${km.toFixed(1)} km`;

/** What Listen says for a listing. */
export function spokenSummary(property: PropertySummary) {
  const { title, rentRwf, distanceKm, availability, bathroom } = property;
  return [
    `${title}.`,
    t('{rent} RWF per month.', { rent: formatNumber(rentRwf) }),
    t('{km} from UR-CST.', { km: formatKm(distanceKm) }),
    `${t(availability === 'AVAILABLE' ? 'Available now' : 'Currently occupied')}.`,
    `${typeLabel(property)}, ${layoutLabel(property).toLowerCase()}.`,
    `${t(bathroom === 'PRIVATE' ? 'Private bathroom' : 'Shared bathroom')}.`,
    t(property.water ? 'Water included.' : 'Water not included.'),
    t(property.electricity ? 'Electricity included.' : 'Electricity not included.'),
    t(property.security ? 'Has security.' : 'No security guard.'),
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
    photos: property.photoUrls,
    facilities: facilityChips(property),
    spokenSummary: spokenSummary(property),
  };
}
