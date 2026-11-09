import type { Prisma } from '@prisma/client';
import type { PropertyDetail, PropertySummary, Role } from '@urcst/shared';

/** The only listings students and guests may ever see. */
export const PUBLIC_LISTING = {
  reviewStatus: 'APPROVED',
  deletedAt: null,
} satisfies Prisma.PropertyWhereInput;

/** A photo added in the wizard stays hidden until the listing is submitted. */
const PUBLIC_PHOTOS = { pendingAdd: false };

export const SUMMARY_INCLUDE = {
  location: true,
  photos: {
    where: PUBLIC_PHOTOS,
    orderBy: [{ isCover: 'desc' }, { position: 'asc' }],
  },
} satisfies Prisma.PropertyInclude;

export const DETAIL_INCLUDE = {
  location: true,
  photos: { where: PUBLIC_PHOTOS, orderBy: [{ isCover: 'desc' }, { position: 'asc' }] },
  landlord: { include: { landlordProfile: true } },
} satisfies Prisma.PropertyInclude;

type SummaryRow = Prisma.PropertyGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type DetailRow = Prisma.PropertyGetPayload<{ include: typeof DETAIL_INCLUDE }>;

/** Only a draft that was never submitted lacks these, and such a draft is never shown. */
function submitted<T extends SummaryRow>(row: T) {
  const { type, location, distanceKm } = row;
  if (!type || !location || !distanceKm) throw new Error(`Listing ${row.id} is not complete.`);
  return { type, location, distanceKm };
}

export function toSummary(row: SummaryRow): PropertySummary {
  const { type, location, distanceKm } = submitted(row);

  return {
    id: row.id,
    title: row.title,
    type,
    rooms: row.rooms,
    area: location.name,
    landmark: row.landmark,
    distanceKm: distanceKm.toNumber(),
    rentRwf: row.rentRwf,
    water: row.water,
    electricity: row.electricity,
    bathroom: row.bathroom,
    security: row.security,
    selfContained: row.selfContained,
    availability: row.availability,
    coverUrl: row.photos[0]?.url ?? null,
    photoUrls: row.photos.map(({ url }) => url),
  };
}

/** WhatsApp links need the country code and digits only. */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `250${digits.slice(1)}` : digits;
}

export function toDetail(row: DetailRow): PropertyDetail {
  const { landlord } = row;
  const profile = landlord.landlordProfile;

  return {
    ...toSummary(row),
    description: row.description,
    address: row.address,
    reviewStatus: row.reviewStatus,
    areaDistanceKm: submitted(row).location.distanceKm.toNumber(),
    pin: row.pinX !== null && row.pinY !== null ? { x: row.pinX, y: row.pinY } : null,
    photos: row.photos.map(({ id, url }) => ({ id, url })),
    landlord: {
      name: landlord.fullName,
      phone: profile?.allowPhone ? landlord.phone : null,
      whatsapp: profile?.allowWhatsapp && landlord.phone ? whatsappNumber(landlord.phone) : null,
      inApp: profile?.allowInApp ?? false,
    },
  };
}

interface Viewer {
  id: string;
  role: Role;
}

/** The public see approved listings. An owner or administrator can see any of theirs. */
export function canView(
  row: {
    reviewStatus: string;
    deletedAt: Date | null;
    landlordId: string;
    locationId: string | null;
  },
  viewer: Viewer | null,
) {
  // The wizard shows a draft to its owner. It has nothing to show here yet.
  if (row.locationId === null) return false;
  if (row.reviewStatus === 'APPROVED' && row.deletedAt === null) return true;
  if (viewer?.role === 'ADMIN') return true;
  return row.deletedAt === null && viewer?.role === 'LANDLORD' && viewer.id === row.landlordId;
}
