import { z } from 'zod';

export const roomTypeSchema = z.enum(['SINGLE', 'SHARED', 'STUDIO', 'APARTMENT']);
export type RoomType = z.infer<typeof roomTypeSchema>;

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  SINGLE: 'Single room',
  SHARED: 'Shared room',
  STUDIO: 'Studio',
  APARTMENT: 'Apartment',
};

export const availabilitySchema = z.enum(['AVAILABLE', 'OCCUPIED']);
export type Availability = z.infer<typeof availabilitySchema>;

export type ReviewStatus =
  'DRAFT' | 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'REMOVED';

export const layoutSchema = z.enum(['any', 'self', 'shared']);
export type Layout = z.infer<typeof layoutSchema>;

export const roomsSchema = z.enum(['any', '1', '2']);
export type RoomsFilter = z.infer<typeof roomsSchema>;

export const sortSchema = z.enum(['recommended', 'price-asc', 'price-desc', 'distance']);
export type PropertySort = z.infer<typeof sortSchema>;

/** The ends of the search sliders. A filter at its end means "no limit", so it is never sent. */
export const RENT_SLIDER = { min: 30_000, max: 250_000, step: 5_000 };
export const DISTANCE_SLIDER = { min: 0.5, max: 5, step: 0.5 };

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// Works for query strings, where everything is text, and for JSON bodies.
const flag = z.preprocess((value) => value === 'true' || value === true, z.boolean());

const wholeRwf = (message: string) =>
  z.coerce.number({ error: message }).int(message).min(0, message);

const roomTypes = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
  z.array(roomTypeSchema, { error: 'Choose room types from the list.' }).default([]),
);

export const searchFiltersSchema = z.object({
  q: z.string().trim().max(100, 'Use 100 characters or fewer.').default(''),
  minRent: wholeRwf('Enter the minimum rent as a whole number.').optional(),
  maxRent: wholeRwf('Enter the maximum rent as a whole number.').optional(),
  maxDistance: z.coerce
    .number({ error: 'Enter the distance in kilometres.' })
    .positive('Enter the distance in kilometres.')
    .optional(),
  types: roomTypes,
  layout: layoutSchema.default('any'),
  water: flag,
  electricity: flag,
  privateBath: flag,
  security: flag,
  rooms: roomsSchema.default('any'),
  availableOnly: flag,
});
export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export const EMPTY_FILTERS: SearchFilters = searchFiltersSchema.parse({});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const propertyQuerySchema = searchFiltersSchema.extend({
  ...paginationSchema.shape,
  locationId: z.string().min(1).optional(),
  sort: sortSchema.default('recommended'),
  /** Fetches named listings, for Compare and a guest's Saved list. */
  ids: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
      z.array(z.string().min(1)).max(MAX_PAGE_SIZE),
    )
    .optional(),
});
export type PropertyQuery = z.infer<typeof propertyQuerySchema>;

export const searchParseSchema = z.object({
  text: z.string().trim().max(200, 'Use 200 characters or fewer.'),
});
export type SearchParseInput = z.infer<typeof searchParseSchema>;

export const reportReasonSchema = z.enum(
  ['WRONG_INFORMATION', 'PHOTOS_DONT_MATCH', 'NO_LONGER_AVAILABLE', 'SUSPICIOUS'],
  { error: 'Please choose what is wrong.' },
);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  WRONG_INFORMATION: 'Information is wrong',
  PHOTOS_DONT_MATCH: "Photos don't match the room",
  NO_LONGER_AVAILABLE: 'Room is no longer available',
  SUSPICIOUS: 'Suspicious or fake listing',
};

export const reportSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().trim().max(1000, 'Use 1,000 characters or fewer.').optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PropertySummary {
  id: string;
  title: string;
  type: RoomType;
  rooms: number;
  area: string;
  landmark: string;
  distanceKm: number;
  rentRwf: number;
  water: boolean;
  electricity: boolean;
  bathroom: 'PRIVATE' | 'SHARED';
  security: boolean;
  selfContained: boolean;
  availability: Availability;
  coverUrl: string | null;
}

export interface PropertyPhotoDto {
  id: string;
  url: string;
}

export interface PropertyDetail extends PropertySummary {
  description: string;
  address: string | null;
  reviewStatus: ReviewStatus;
  /** How far the middle of the neighbourhood is from campus. */
  areaDistanceKm: number;
  pin: { x: number; y: number } | null;
  photos: PropertyPhotoDto[];
  landlord: {
    name: string;
    /** Each is null when the landlord has turned that contact method off. */
    phone: string | null;
    /** Digits only, as WhatsApp links need them. */
    whatsapp: string | null;
    inApp: boolean;
  };
}

export interface LocationDto {
  id: string;
  name: string;
  distanceKm: number;
  angleDeg: number;
}
