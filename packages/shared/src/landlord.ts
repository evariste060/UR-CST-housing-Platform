import { z } from 'zod';
import { toFieldErrors } from './auth';
import {
  availabilitySchema,
  paginationSchema,
  roomTypeSchema,
  type Availability,
  type ReviewStatus,
  type RoomType,
} from './properties';

export const MIN_RENT_RWF = 10_000;
export const MAX_RENT_RWF = 1_000_000;
export const MAX_ROOMS = 10;
export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const WIZARD_STEPS = [
  'Basic information',
  'Location',
  'Rent & facilities',
  'Photos',
  'Review & submit',
] as const;

/** What the wizard holds. Half-finished answers are allowed here. Submit checks them all. */
export const listingDraftSchema = z.object({
  title: z.string().max(120, 'Use 120 characters or fewer.'),
  type: roomTypeSchema.nullable(),
  rooms: z.number().int().min(1).max(MAX_ROOMS),
  description: z.string().max(2000, 'Use 2,000 characters or fewer.'),
  locationId: z.string().nullable(),
  landmark: z.string().max(120, 'Use 120 characters or fewer.'),
  address: z.string().max(200, 'Use 200 characters or fewer.'),
  pin: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).nullable(),
  rentRwf: z.number().int().min(0).nullable(),
  availability: availabilitySchema,
  water: z.boolean(),
  electricity: z.boolean(),
  security: z.boolean(),
  bathroom: z.enum(['PRIVATE', 'SHARED']),
  selfContained: z.boolean(),
});
export type ListingDraft = z.infer<typeof listingDraftSchema>;

/** Autosave sends only what changed. */
export const listingPatchSchema = listingDraftSchema.partial();
export type ListingPatch = z.infer<typeof listingPatchSchema>;

export const EMPTY_DRAFT: ListingDraft = {
  title: '',
  type: null,
  rooms: 1,
  description: '',
  locationId: null,
  landmark: '',
  address: '',
  pin: null,
  rentRwf: null,
  availability: 'AVAILABLE',
  water: true,
  electricity: true,
  security: false,
  bathroom: 'SHARED',
  selfContained: false,
};

const basicInfoSchema = z.object({
  title: z.string().superRefine((value, ctx) => {
    const length = value.trim().length;
    if (length === 0) ctx.addIssue('Please enter a property title.');
    else if (length < 5) ctx.addIssue('Use at least 5 characters so students can recognise it.');
  }),
  type: roomTypeSchema.nullable().refine((value) => value !== null, {
    error: 'Please choose the accommodation type.',
  }),
  rooms: z
    .number()
    .min(1, 'Enter a number of rooms from 1 to 10.')
    .max(MAX_ROOMS, 'Enter a number of rooms from 1 to 10.'),
  description: z.string().superRefine((value, ctx) => {
    const length = value.trim().length;
    if (length < 30) ctx.addIssue(`Please write at least 30 characters (now ${length}).`);
  }),
});

const locationSchema = z.object({
  locationId: z
    .string()
    .nullable()
    .refine((value) => value !== null, { error: 'Please choose the neighbourhood.' }),
  landmark: z
    .string()
    .refine(
      (value) => value.trim().length >= 3,
      'Please add a nearby landmark students will recognise.',
    ),
});

const rentSchema = z.object({
  rentRwf: z
    .number()
    .nullable()
    .superRefine((value, ctx) => {
      if (!value) ctx.addIssue('Please enter the monthly rent in RWF.');
      else if (value < MIN_RENT_RWF || value > MAX_RENT_RWF) {
        ctx.addIssue('Enter an amount between 10,000 and 1,000,000 RWF.');
      }
    }),
});

const STEP_SCHEMAS = [basicInfoSchema, locationSchema, rentSchema];
export const NO_PHOTOS_MESSAGE =
  'Please add at least one photo. Listings with 3 or more photos get more inquiries.';

/** The errors on one wizard step, with field names as keys. Steps are numbered from 1. */
export function stepErrors(step: number, draft: ListingDraft, photoCount: number) {
  if (step === 4) return photoCount > 0 ? {} : { photos: NO_PHOTOS_MESSAGE };

  const schema = STEP_SCHEMAS[step - 1];
  const result = schema?.safeParse(draft);
  return result && !result.success ? toFieldErrors(result.error) : {};
}

/** Every error in the listing. The server and the wizard both use this, so they cannot differ. */
export function listingErrors(draft: ListingDraft, photoCount: number) {
  return [1, 2, 3, 4].reduce<Record<string, string>>(
    (errors, step) => ({ ...errors, ...stepErrors(step, draft, photoCount) }),
    {},
  );
}

export const landlordFilterSchema = z.enum([
  'all',
  'available',
  'occupied',
  'pending',
  'changes',
  'drafts',
]);
export type LandlordFilter = z.infer<typeof landlordFilterSchema>;

export const LISTING_STATUS_FILTERS = [
  'all',
  'DRAFT',
  'PENDING',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
  'REMOVED',
] as const;

const searchText = z.string().trim().max(100, 'Use 100 characters or fewer.').default('');

/** My Properties: a quick tab, the two dropdowns, search and sort all combine. */
export const landlordPropertiesQuerySchema = paginationSchema.extend({
  filter: landlordFilterSchema.default('all'),
  availability: z.enum(['all', 'available', 'occupied']).default('all'),
  status: z.enum(LISTING_STATUS_FILTERS).default('all'),
  q: searchText,
  sort: z.enum(['updated-desc', 'updated-asc']).default('updated-desc'),
});
export type LandlordPropertyQuery = z.infer<typeof landlordPropertiesQuerySchema>;

export const photoArrangementSchema = z.object({
  order: z.array(z.string().min(1)).max(MAX_PHOTOS),
  coverId: z.string().min(1),
});
export type PhotoArrangement = z.infer<typeof photoArrangementSchema>;

export const availabilityInputSchema = z.object({ availability: availabilitySchema });

export const inquiryStatusSchema = z.enum(['NEW', 'HANDLED']);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const landlordInquiriesQuerySchema = paginationSchema.extend({
  status: z.enum(['all', 'new', 'handled']).default('all'),
  q: searchText,
});
export type InquiryFilter = z.infer<typeof landlordInquiriesQuerySchema>['status'];

export const inquiryStatusInputSchema = z.object({ status: inquiryStatusSchema });

export const replySchema = z.object({
  message: z
    .string({ error: 'Please write a reply.' })
    .trim()
    .min(1, 'Please write a reply.')
    .max(2000, 'Use 2,000 characters or fewer.'),
});
export type ReplyInput = z.infer<typeof replySchema>;

/** A row on My properties. Fields are empty on a draft that has not been filled in yet. */
export interface LandlordProperty {
  id: string;
  title: string;
  area: string | null;
  distanceKm: number | null;
  rentRwf: number | null;
  availability: Availability;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  coverUrl: string | null;
  /** Saved answers are waiting to be submitted. */
  hasUnsubmittedChanges: boolean;
  updatedAt: string;
  type: RoomType | null;
}

export interface LandlordPropertyList {
  items: LandlordProperty[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<LandlordFilter, number>;
}

export interface WizardPhoto {
  id: string;
  url: string;
}

/** A listing as the wizard sees it: saved answers on top of the live listing. */
export interface ListingForm {
  id: string;
  reviewStatus: ReviewStatus;
  values: ListingDraft;
  photos: WizardPhoto[];
  coverId: string | null;
  savedAt: string;
}

export interface LandlordInquiry {
  id: string;
  student: string;
  property: { id: string; title: string };
  status: InquiryStatus;
  lastMessage: { body: string; fromLandlord: boolean; createdAt: string };
  createdAt: string;
}

export interface LandlordInquiryList {
  items: LandlordInquiry[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<InquiryFilter, number>;
}

export interface InquiryThread extends LandlordInquiry {
  /** The listing the student asked about. Student contact details stay private. */
  property: LandlordInquiry['property'] & {
    coverUrl: string | null;
    area: string | null;
    rentRwf: number;
    reviewStatus: ReviewStatus;
  };
  messages: { id: string; body: string; fromLandlord: boolean; createdAt: string }[];
}

export interface LandlordSummary {
  total: number;
  available: number;
  occupied: number;
  pending: number;
  changes: number;
  drafts: number;
  newInquiries: number;
  recentInquiries: LandlordInquiry[];
  properties: LandlordProperty[];
}

export interface AvailabilityResult {
  availability: Availability;
  previous: Availability;
}
