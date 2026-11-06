import { z } from 'zod';
import { searchFiltersSchema, type PropertySummary, type SearchFilters } from './properties';

const MAX_MERGED = 100;
const MAX_RESTORED = 20;

export const mergeSavedSchema = z.object({
  propertyIds: z.array(z.string().min(1)).max(MAX_MERGED),
});
export type MergeSavedInput = z.infer<typeof mergeSavedSchema>;

const searchLabel = z.string().trim().min(1).max(300);

export const recordSearchSchema = z.object({
  label: searchLabel,
  filters: searchFiltersSchema,
});
export type RecordSearchInput = z.input<typeof recordSearchSchema>;

export const inquirySchema = z.object({
  message: z
    .string({ error: 'Please write a message.' })
    .trim()
    .min(10, 'Please write at least 10 characters so the landlord knows what you need.')
    .max(2000, 'Use 2,000 characters or fewer.'),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

/** Puts cleared history back. The Undo on Clear history sends what it was shown. */
export const restoreHistorySchema = z.object({
  views: z
    .array(z.object({ propertyId: z.string().min(1), viewedAt: z.iso.datetime() }))
    .max(MAX_RESTORED),
  searches: z
    .array(
      z.object({
        label: searchLabel,
        filters: searchFiltersSchema,
        createdAt: z.iso.datetime(),
      }),
    )
    .max(MAX_RESTORED),
});
export type RestoreHistoryInput = z.input<typeof restoreHistorySchema>;

export interface SavedIdsResponse {
  ids: string[];
}

export interface RecentView {
  property: PropertySummary;
  viewedAt: string;
}

export interface RecentSearch {
  id: string;
  label: string;
  filters: SearchFilters;
  createdAt: string;
}

export interface HistoryResponse {
  views: RecentView[];
  searches: RecentSearch[];
}

export interface StudentInquiry {
  id: string;
  property: PropertySummary;
  lastMessage: { body: string; fromLandlord: boolean; createdAt: string };
  replied: boolean;
  createdAt: string;
}
