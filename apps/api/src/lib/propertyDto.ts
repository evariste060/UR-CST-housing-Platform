import type { Prisma } from '@prisma/client';
import type { PropertyDetail, PropertySummary, Role } from '@urcst/shared';

/** The only listings students and guests may ever see. */
export const PUBLIC_LISTING = {
  reviewStatus: 'APPROVED',
  deletedAt: null,
} satisfies Prisma.PropertyWhereInput;

export const SUMMARY_INCLUDE = {
  location: true,
  photos: { orderBy: [{ isCover: 'desc' }, { position: 'asc' }], take: 1 },
} satisfies Prisma.PropertyInclude;

export const DETAIL_INCLUDE = {
  location: true,
  photos: { orderBy: [{ isCover: 'desc' }, { position: 'asc' }] },
  landlord: { include: { landlordProfile: true } },
} satisfies Prisma.PropertyInclude;

type SummaryRow = Prisma.PropertyGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type DetailRow = Prisma.PropertyGetPayload<{ include: typeof DETAIL_INCLUDE }>;

export function toSummary(row: SummaryRow): PropertySummary {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    rooms: row.rooms,
    area: row.location.name,
    landmark: row.landmark,
    distanceKm: row.distanceKm.toNumber(),
    rentRwf: row.rentRwf,
    water: row.water,
    electricity: row.electricity,
    bathroom: row.bathroom,
    security: row.security,
    selfContained: row.selfContained,
    availability: row.availability,
    coverUrl: row.photos[0]?.url ?? null,
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
    areaDistanceKm: row.location.distanceKm.toNumber(),
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
  row: { reviewStatus: string; deletedAt: Date | null; landlordId: string },
  viewer: Viewer | null,
) {
  if (row.reviewStatus === 'APPROVED' && row.deletedAt === null) return true;
  if (viewer?.role === 'ADMIN') return true;
  return row.deletedAt === null && viewer?.role === 'LANDLORD' && viewer.id === row.landlordId;
}
