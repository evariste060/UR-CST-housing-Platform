import { EMPTY_FILTERS, type PropertySort, type SearchFilters } from '@urcst/shared';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, buttonClass } from '../components/Button';
import { FiltersPanel } from '../components/FiltersPanel';
import { HeaderMenu } from '../components/HeaderMenus';
import { Icon, type IconName } from '../components/Icon';
import { ListingCard } from '../components/ListingCard';
import { EmptyState, ErrorState, SkeletonCards } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { formatNumber } from '../lib/format';
import { useRovingRadio } from '../lib/useRovingRadio';
import {
  filterChips,
  filtersFromParams,
  filtersToParams,
  nextBudget,
  nextDistance,
  removeChip,
  withBudget,
  withDistance,
  withoutFacilityAndTypeFilters,
} from '../student/filters';
import { usePropertySearch } from '../student/queries';
import { t, tNode } from '../i18n';

const SORTS: { value: PropertySort; label: string; icon: IconName }[] = [
  { value: 'recommended', label: 'Recommended', icon: 'star' },
  { value: 'price-asc', label: 'Lowest price', icon: 'chevD' },
  { value: 'price-desc', label: 'Highest price', icon: 'chevR' },
  { value: 'distance', label: 'Closest', icon: 'pin' },
];

function resultCountText(count: number) {
  if (count === 0) return 'No places match';
  return count === 1 ? '1 place matches your search' : `${count} places match your search`;
}

function SortMenu({
  sort,
  onChange,
}: {
  sort: PropertySort;
  onChange: (sort: PropertySort) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const radio = useRovingRadio(
    SORTS.map(({ value }) => value),
    sort,
    onChange,
  );
  const current = SORTS.find(({ value }) => value === sort);

  function choose(value: PropertySort) {
    onChange(value);
    setOpen(false);
    wrapper.current?.querySelector('button')?.focus();
  }

  return (
    <div ref={wrapper}>
      <HeaderMenu
        id="sort"
        label={t('Sort results')}
        buttonClass={buttonClass({ variant: 'secondary', size: 'sm' })}
        openOnHover
        open={open}
        onOpenChange={setOpen}
        button={
          <>
            {t('Sort:')} {tNode(current?.label)}
            <Icon name="chevD" />
          </>
        }
      >
        <div className="flex flex-col gap-0.5" role="radiogroup" aria-label={t('Sort results')}>
          {SORTS.map(({ value, label, icon }) => (
            <button
              key={value}
              className="hmenu-item"
              {...radio(value)}
              onClick={() => choose(value)}
            >
              <Icon name={sort === value ? 'check' : icon} />
              <span>{tNode(label)}</span>
            </button>
          ))}
        </div>
      </HeaderMenu>
    </div>
  );
}

interface NoResultsProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters, message?: string) => void;
}

function NoResults({ filters, onChange }: NoResultsProps) {
  const budget = nextBudget(filters);
  const distance = nextDistance(filters);

  return (
    <EmptyState
      icon="search"
      title={t('No accommodation matches your search.')}
      text={t('Try one of these changes. Each one updates the results straight away.')}
      actions={
        <>
          {budget !== undefined && (
            <Button
              variant="secondary"
              icon="plus"
              onClick={() =>
                onChange(
                  withBudget(filters, budget),
                  `Budget increased to ${formatNumber(budget)} RWF.`,
                )
              }
            >
              {t('Increase budget to')} {formatNumber(budget)} {t('RWF')}
            </Button>
          )}
          {distance !== undefined && (
            <Button
              variant="secondary"
              icon="route"
              onClick={() =>
                onChange(withDistance(filters, distance), `Distance expanded to ${distance} km.`)
              }
            >
              {t('Expand distance to')} {tNode(distance)} {t('km')}
            </Button>
          )}
          <Button
            variant="secondary"
            icon="filter"
            onClick={() =>
              onChange(
                withoutFacilityAndTypeFilters(filters),
                'Facility and room-type filters removed.',
              )
            }
          >
            {t('Remove facility & type filters')}
          </Button>
          <Button onClick={() => onChange(EMPTY_FILTERS)}>{t('View all properties')}</Button>
        </>
      }
    />
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { filters, sort } = filtersFromParams(params);
  const toast = useToast();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const search = usePropertySearch(filters, sort);

  // The address updates a moment after a click, so a quick second click still sees the old
  // filters. Each change adds only what it altered to the ones waiting to reach the address.
  const waiting = useRef<SearchFilters | null>(null);
  useEffect(() => {
    waiting.current = null;
  }, [params]);

  function change(next: SearchFilters, message?: string) {
    const merged: Record<string, unknown> = { ...(waiting.current ?? filters) };
    const before: Record<string, unknown> = filters;
    const after: Record<string, unknown> = next;
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (after[key] !== before[key]) merged[key] = after[key];
    }
    waiting.current = merged as SearchFilters;
    setParams(filtersToParams(waiting.current, sort), { replace: true });
    if (message) toast(message);
  }

  function changeSort(next: PropertySort) {
    setParams(filtersToParams(filters, next), { replace: true });
  }

  const pages = search.data?.pages;
  const items = pages?.flatMap((page) => page.items) ?? [];
  const total = pages?.[0]?.total;
  const chips = filterChips(filters);

  function results() {
    if (search.isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load accommodation. Please try again.')}
          text={t(
            'Check your internet connection. Your filters are kept, so you will not need to set them again.',
          )}
          actions={
            <Button icon="refresh" onClick={() => void search.refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (total === undefined) return <SkeletonCards count={3} />;

    return (
      <>
        <div className="toolbar">
          <p className="result-count" aria-live="polite" id="res-count">
            {tNode(resultCountText(total))}
          </p>
        </div>
        {chips.length > 0 && (
          <div className="chips" role="group" aria-label={t('Applied filters')}>
            {chips.map(({ key, label }) => (
              <span className="chip" key={key}>
                {tNode(label)}
                <button
                  type="button"
                  aria-label={t('Remove filter {label}', { label })}
                  // The click handler reads the ref, not render. The compiler cannot tell once t() is in this list.
                  // eslint-disable-next-line react-hooks/refs
                  onClick={() => change(removeChip(filters, key))}
                >
                  <Icon name="x" />
                </button>
              </span>
            ))}
            <button type="button" className="link-btn" onClick={() => change(EMPTY_FILTERS)}>
              {t('Clear all filters')}
            </button>
          </div>
        )}
        {total === 0 ? (
          <NoResults filters={filters} onChange={change} />
        ) : (
          <>
            <div className={view === 'list' ? 'grid-cards list-view' : 'grid-cards'}>
              {items.map((property) => (
                <ListingCard key={property.id} property={property} />
              ))}
            </div>
            {search.hasNextPage && (
              <div className="show-more">
                <Button
                  variant="secondary"
                  disabled={search.isFetchingNextPage}
                  onClick={() => void search.fetchNextPage()}
                >
                  {t('Show more')}
                </Button>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Find accommodation near UR-CST')}</h1>
          <p className="muted">
            {t(
              'Prices are per month in RWF. Distances are approximate walking-route estimates from the campus gate.',
            )}
          </p>
        </div>
      </div>
      <div className="toolbar">
        <button
          type="button"
          className={`${buttonClass({ variant: 'secondary' })} hidden! max-tablet:inline-flex!`}
          aria-expanded={drawerOpen}
          aria-controls="filters"
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="filter" />
          {t('Filters')}{' '}
          {chips.length > 0 && <span className="count-pill">{tNode(chips.length)}</span>}
        </button>
        <div className="row sort-row">
          <SortMenu sort={sort} onChange={changeSort} />
          <div className="seg" role="group" aria-label={t('Layout')}>
            <button
              type="button"
              className="aria-pressed:bg-blue aria-pressed:text-white"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <Icon name="grid" />
              <span className="sr-only">{t('Grid view')}</span>
            </button>
            <button
              type="button"
              className="aria-pressed:bg-blue aria-pressed:text-white"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <Icon name="list" />
              <span className="sr-only">{t('List view')}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="search-layout">
        <FiltersPanel
          filters={filters}
          onChange={change}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onClear={() => change(EMPTY_FILTERS, 'Filters cleared.')}
        />
        <section id="results-region" aria-label={t('Results')}>
          {tNode(results())}
        </section>
      </div>
    </main>
  );
}
