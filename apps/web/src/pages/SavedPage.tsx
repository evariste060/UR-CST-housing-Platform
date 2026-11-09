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
import { t, tNode } from '../i18n';

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
    <article
      className={`pcard flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-raised ${selected ? 'border-blue shadow-[0_0_0_2px_var(--blue)]' : 'border-line'}`}
      aria-label={tNode(title)}
    >
      <div className="media relative aspect-[16/10] bg-surface">
        {coverUrl ? (
          <img className="size-full object-cover" src={coverUrl} alt="" />
        ) : (
          <span className="grid size-full place-items-center text-muted [&>.ic]:size-8">
            <Icon name="image" />
          </span>
        )}
        <AvailabilityBadge availability={availability} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link className="title t-card line-clamp-2 text-ink" to={href}>
          {tNode(title)}
        </Link>
        <p className="num m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" />
            {formatKm(distanceKm)} {t('from UR-CST')}
          </span>
          <span>{tNode(typeLabel(property))}</span>
        </p>
        <p className="m-0 border-y border-line py-2">
          <span className="t-price num text-ink">{formatRwf(rentRwf)}</span>{' '}
          <span className="text-sm text-muted">{t('/ month')}</span>
        </p>
        <label
          className={`check flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 font-medium ${selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-surface'}`}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
          />
          <span>
            {t('Compare')}
            <span className="sr-only"> {tNode(title)}</span>
          </span>
        </label>
        <div className="mt-auto flex gap-2">
          <Link
            className={`${buttonClass({ variant: 'secondary', size: 'sm' })} flex-1 whitespace-nowrap hover:border-blue! hover:bg-blue-50! hover:text-blue-700!`}
            to={href}
          >
            {t('View details')}
          </Link>
          <button
            type="button"
            className="inline-grid size-11 flex-none cursor-pointer place-items-center rounded-md border border-line bg-card text-red-text transition-colors hover:border-red-border hover:bg-red-50"
            aria-label={t('Remove {title} from saved', { title })}
            title={t('Remove from saved')}
            onClick={onRemove}
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>
    </article>
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
          title={t('Unable to load your saved properties. Please try again.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
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
          title={t("You haven't saved any properties yet.")}
          text={t(
            "Tap the heart on any property to keep it here, so you don't need to remember its name later.",
          )}
          actions={
            <Link className={buttonClass()} to="/search">
              <Icon name="search" />
              {t('Explore accommodation')}
            </Link>
          }
        />
      );
    }
    return (
      <>
        {items.length >= 2 && (
          <p className="tip saved-tip mb-4!">
            <Icon name="info" />
            {t('Tick "Compare" on two to four properties, then select "Compare selected".')}
          </p>
        )}
        <div className="grid grid-cols-4 gap-4 max-desktop:grid-cols-3 max-tablet:grid-cols-2 max-phone:grid-cols-1">
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
          <h1 className="t-page">{t('Saved properties')}</h1>
          <p className="muted m-0">
            {t('Saving a property keeps it on this list. It does not reserve the room.')}
          </p>
        </div>
        {items.length >= 2 && (
          <Button icon="compare" aria-disabled={chosen.length < 2} onClick={compareSelected}>
            {t('Compare selected (')}
            {tNode(chosen.length)})
          </Button>
        )}
      </div>
      {content()}
    </main>
  );
}
