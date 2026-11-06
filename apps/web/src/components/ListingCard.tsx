import type { PropertySummary } from '@urcst/shared';
import { toCardData } from '../lib/format';
import { useCompare } from '../student/CompareProvider';
import { useSaved } from '../student/SavedProvider';
import { PropertyCard } from './PropertyCard';

/** A real listing on a card, wired to the visitor's Saved and Compare lists. */
export function ListingCard({ property }: { property: PropertySummary }) {
  const saved = useSaved();
  const compare = useCompare();

  return (
    <PropertyCard
      property={toCardData(property)}
      saved={saved.isSaved(property.id)}
      inCompare={compare.isComparing(property.id)}
      onToggleSave={() => saved.toggle(property.id)}
      onToggleCompare={() => compare.toggle(property.id)}
    />
  );
}
