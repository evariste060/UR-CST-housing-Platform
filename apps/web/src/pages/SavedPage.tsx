import { useQuery } from '@tanstack/react-query';
import type { PropertySummary } from '@urcst/shared';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AvailabilityBadge } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, SkeletonCards } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { formatRwf, typeLabel, formatKm } from '../lib/format';
import { COMPARE_LIMIT_MESSAGE, MAX_COMPARE, useCompare } from '../student/CompareProvider';
import { useSaved } from '../student/SavedProvider';
import { usePropertiesByIds } from '../student/queries';
import { useStudentId } from '../student/useHistory';

function useSavedList(ids: string[]) {
  const studentId = useStudentId();
  const server = useQuery({
    queryKey: ['saved-list', studentId],
    queryFn: async () => (await api.saved()).items,
    enabled: studentId !== null,
  });
  const local = usePropertiesByIds(studentId ? [] : ids);
  const source = studentId ? server : local;

  // Follows the ids straight away, so Remove and Undo do not wait for the server.
  const items = useMemo(() => {
    const list = studentId ? (server.data ?? []) : local.items;
    return list.filter(({ id }: PropertySummary) => ids.includes(id));
  }, [ids, local.items, server.data, studentId]);

  return {
    items,
    isPending: source.isPending,
    isError: source.isError,
    refetch: source.refetch,
  };
}

function SavedRow({
  property,
  selected,
  onSelect,
  onRemove,
}: {
  property: PropertySummary;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onRemove: () => void;
}) {
  const { id, title, rentRwf, distanceKm, availability, coverUrl } = property;
  const href = `/properties/${id}`;

  return (
    <div className="list-item">
      <label className="check saved-check">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
        />
        <span className="sr-only">Select {title} to compare</span>
      </label>
      {coverUrl && <img className="thumb" src={coverUrl} alt="" />}
      <div className="grow">
        <Link className="t-card saved-title" to={href}>
          {title}
        </Link>
        <p className="num saved-line">
          <b>{formatRwf(rentRwf)}</b>{' '}
          <span className="muted">
            / month · {formatKm(distanceKm)} from UR-CST · {typeLabel(property)}
          </span>
        </p>
        <div className="status-pair">
          <AvailabilityBadge availability={availability} />
        </div>
      </div>
      <div className="acts">
        <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to={href}>
          View details
        </Link>
        <Button
          variant="danger-outline"
          size="sm"
          icon="trash"
          aria-label={`Remove ${title} from saved`}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

export function SavedPage() {
  const saved = useSaved();
  const compare = useCompare();
  const toast = useToast();
  const navigate = useNavigate();
  const { items, isPending, isError, refetch } = useSavedList(saved.ids);
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = selected.filter((id) => saved.ids.includes(id));

  function compareSelected() {
    if (chosen.length < 2) {
      toast('Select at least two properties to compare.', { type: 'error' });
      return;
    }
    if (chosen.length > MAX_COMPARE) {
      toast(COMPARE_LIMIT_MESSAGE, { type: 'error' });
      return;
    }
    compare.replace(chosen);
    navigate('/compare');
  }

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load your saved properties. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (isPending && saved.ids.length > 0) return <SkeletonCards count={2} />;
    if (items.length === 0) {
      return (
        <EmptyState
          icon="heart"
          title="You haven't saved any properties yet."
          text="Tap the heart on any property to keep it here, so you don't need to remember its name later."
          actions={
            <Link className={buttonClass()} to="/search">
              <Icon name="search" />
              Explore accommodation
            </Link>
          }
        />
      );
    }
    return (
      <>
        {items.length >= 2 && (
          <p className="tip saved-tip">
            <Icon name="info" />
            Tick two to four properties, then select &quot;Compare selected&quot;.
          </p>
        )}
        <div className="list">
          {items.map((property) => (
            <SavedRow
              key={property.id}
              property={property}
              selected={chosen.includes(property.id)}
              onSelect={(on) =>
                setSelected(
                  on ? [...chosen, property.id] : chosen.filter((id) => id !== property.id),
                )
              }
              onRemove={() => saved.toggle(property.id)}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Saved properties</h1>
          <p className="muted">
            Saving a property keeps it on this list. It does not reserve the room.
          </p>
        </div>
        {items.length >= 2 && (
          <Button icon="compare" aria-disabled={chosen.length < 2} onClick={compareSelected}>
            Compare selected ({chosen.length})
          </Button>
        )}
      </div>
      {content()}
    </main>
  );
}
