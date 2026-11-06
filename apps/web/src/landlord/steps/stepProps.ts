import type { ListingDraft, ListingPatch } from '@urcst/shared';

export interface StepProps {
  values: ListingDraft;
  errors: Record<string, string>;
  change: (patch: ListingPatch) => void;
}
