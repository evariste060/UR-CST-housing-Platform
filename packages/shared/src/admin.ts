import { z } from 'zod';
import {
  paginationSchema,
  type Paginated,
  type Availability,
  type PropertyDetail,
  type ReportReason,
  type ReviewStatus,
} from './properties';

/** The review tabs. Drafts are the landlord's own and never reach an administrator. */
export const REVIEW_TABS = [
  'PENDING',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'REMOVED',
] as const;
export const reviewTabSchema = z.enum(REVIEW_TABS);
export type ReviewTab = z.infer<typeof reviewTabSchema>;

export const REVIEW_TAB_LABELS: Record<ReviewTab, string> = {
  PENDING: 'Pending',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REMOVED: 'Removed',
};

export const adminListingsQuerySchema = paginationSchema.extend({
  status: reviewTabSchema.default('PENDING'),
});

/** A note the landlord or the record will read. Required for every action except approve. */
const note = (message: string) =>
  z.string({ error: message }).trim().min(1, message).max(1000, 'Use 1,000 characters or fewer.');

export const moderationNoteSchema = z.object({
  note: note('Please write a short note for the landlord.'),
});
export type ModerationNoteInput = z.infer<typeof moderationNoteSchema>;

export const removeListingSchema = z.object({
  note: note('Please add a reason.'),
  /** Resolves this report at the same time. */
  reportId: z.string().min(1).optional(),
});
export type RemoveListingInput = z.infer<typeof removeListingSchema>;

export const resolveReportSchema = z.object({
  note: note('Please add a short note.'),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const userRoleFilterSchema = z.enum(['all', 'student', 'landlord']);
export type UserRoleFilter = z.infer<typeof userRoleFilterSchema>;

export const adminUsersQuerySchema = paginationSchema.extend({
  role: userRoleFilterSchema.default('all'),
  q: z.string().trim().max(100).default(''),
});

export const accountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const userStatusSchema = z.object({ status: accountStatusSchema });
export type UserStatusInput = z.infer<typeof userStatusSchema>;

export const reportStatusFilterSchema = z.enum(['OPEN', 'RESOLVED']);
export type ReportStatusFilter = z.infer<typeof reportStatusFilterSchema>;

export const adminReportsQuerySchema = paginationSchema.extend({
  status: reportStatusFilterSchema.default('OPEN'),
});

export const MAX_LOCATION_KM = 5;

export const locationInputSchema = z.object({
  name: z
    .string({ error: 'Please enter a location name.' })
    .trim()
    .min(1, 'Please enter a location name.')
    .max(60, 'Use 60 characters or fewer.'),
  distanceKm: z.coerce
    .number({ error: 'Enter a distance between 0.1 and 5 km (the pilot area).' })
    .min(0.1, 'Enter a distance between 0.1 and 5 km (the pilot area).')
    .max(MAX_LOCATION_KM, 'Enter a distance between 0.1 and 5 km (the pilot area).')
    .transform((km) => Math.round(km * 10) / 10),
  /** Only for the schematic map. Undo sends the old value back. */
  angleDeg: z.number().int().min(0).max(359).optional(),
});
export type LocationInput = z.input<typeof locationInputSchema>;

export const adminLocationsQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(60).default(''),
});

export interface ActivityItem {
  id: string;
  action: string;
  text: string;
  createdAt: string;
}

export interface AdminSummary {
  counts: {
    students: number;
    landlords: number;
    listings: number;
    pending: number;
    openReports: number;
  };
  pending: {
    id: string;
    title: string;
    landlord: string;
    submittedAt: string | null;
    coverUrl: string | null;
  }[];
  reports: { id: string; propertyId: string; title: string; reason: string; createdAt: string }[];
  activity: ActivityItem[];
}

export interface AdminListing {
  id: string;
  title: string;
  landlord: string;
  rentRwf: number;
  area: string;
  submittedAt: string | null;
  photoCount: number;
  photoUrls: string[];
  reviewStatus: ReviewStatus;
  availability: Availability;
  reviewNote: string | null;
}

export interface AdminListingList extends Paginated<AdminListing> {
  counts: Record<ReviewTab, number>;
}

export interface ChecklistItem {
  key: 'rent' | 'photos' | 'area' | 'description';
  label: string;
  ok: boolean;
}

export interface AdminListingDetail {
  listing: PropertyDetail;
  landlord: { id: string; name: string; email: string; phone: string | null };
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  checklist: ChecklistItem[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'LANDLORD';
  status: AccountStatus;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  phone: string | null;
  /** Listings for a landlord, inquiries sent for a student. */
  count: number;
}

export interface AdminReport {
  id: string;
  property: {
    id: string;
    title: string;
    reviewStatus: ReviewStatus;
    rentRwf: number;
    photoCount: number;
    water: boolean;
    electricity: boolean;
  };
  reason: ReportReason;
  details: string | null;
  reporter: string;
  status: 'OPEN' | 'RESOLVED';
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminReportList extends Paginated<AdminReport> {
  counts: { OPEN: number; RESOLVED: number };
}

export interface AdminLocation {
  id: string;
  name: string;
  distanceKm: number;
  angleDeg: number;
  /** Listings that use it, not counting removed or deleted ones. */
  listings: number;
}
