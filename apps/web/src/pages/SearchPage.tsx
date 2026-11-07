import { EMPTY_FILTERS, type PropertySort, type SearchFilters } from '@urcst/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, buttonClass } from '../components/Button';
import { FiltersPanel } from '../components/FiltersPanel';
import { Icon, type IconName } from '../components/Icon';
import { ListingCard } from '../components/ListingCard';
import { EmptyState, ErrorState, SkeletonCards } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { formatNumber } from '../lib/format';
import { useRovingRadio } from '../lib/useRovingRadio';
import { useSaved } from '../student/SavedProvider';
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
import { countResults, usePropertySearch } from '../student/queries';
import { useRunSearch } from '../student/useHistory';

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

/** Remounted by a new `key` when the place changes elsewhere, so the box shows the new text. */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (text: string) => void }) {
  const [text, setText] = useState(initial);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form className="searchbar" role="search" onSubmit={submit}>
      <div className="input-icon">
        <Icon name="search" />
        <label htmlFor="s-q" className="sr-only">
          Search by neighbourhood or landmark
        </label>
        <input
          className="input"
          id="s-q"
          value={text}
          placeholder="Search a neighbourhood, e.g. Kiyovu, Muhima"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <button className={buttonClass()} type="submit">
        Search
      </button>
    </form>
  );
}

function SortChips({
  sort,
  onChange,
}: {
  sort: PropertySort;
  onChange: (sort: PropertySort) => void;
}) {
  const radio = useRovingRadio(
    SORTS.map(({ value }) => value),
    sort,
    onChange,
  );

  return (
    <>
      <span className="t-support" id="sort-lbl">
        Sort:
      </span>
      <div className="chipset" role="radiogroup" aria-labelledby="sort-lbl">
        {SORTS.map(({ value, label, icon }) => (
          <button key={value} className="pchip sm" {...radio(value)}>
            <Icon name={sort === value ? 'check' : icon} />
            {label}
          </button>
        ))}
      </div>
    </>
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
      title="No accommodation matches your search."
      text="Try one of these changes. Each one updates the results straight away."
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
              Increase budget to {formatNumber(budget)} RWF
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
              Expand distance to {distance} km
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
            Remove facility &amp; type filters
          </Button>
          <Button onClick={() => onChange(EMPTY_FILTERS)}>View all properties</Button>
        </>
      }
    />
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { filters, sort } = filtersFromParams(params);
  const { user } = useAuth();
  const saved = useSaved();
  const toast = useToast();
  const runSearch = useRunSearch();
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

  async function searchFor(q: string) {
    const next = { ...filters, q };
    runSearch(next);
    try {
      const count = await countResults(next);
      toast(`Showing ${count} result${count === 1 ? '' : 's'}.`, { type: 'info' });
    } catch {
      // The results area already says what went wrong.
    }
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
          title="Unable to load accommodation. Please try again."
          text="Check your internet connection. Your filters are kept, so you will not need to set them again."
          actions={
            <Button icon="refresh" onClick={() => void search.refetch()}>
              Try again
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
            {resultCountText(total)}
          </p>
        </div>
        {chips.length > 0 && (
          <div className="chips" role="group" aria-label="Applied filters">
            {chips.map(({ key, label }) => (
              <span className="chip" key={key}>
                {label}
                <button
                  type="button"
                  aria-label={`Remove filter ${label}`}
                  onClick={() => change(removeChip(filters, key))}
                >
                  <Icon name="x" />
                </button>
              </span>
            ))}
            <button type="button" className="link-btn" onClick={() => change(EMPTY_FILTERS)}>
              Clear all filters
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
                  Show more
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
          <h1 className="t-page">Find accommodation near UR-CST</h1>
          <p className="muted">
            Prices are per month in RWF. Distances are approximate walking-route estimates from the
            campus gate.
          </p>
        </div>
        {user?.role !== 'STUDENT' && (
          <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to="/saved">
            <Icon name="heart" />
            Saved ({saved.ids.length})
          </Link>
        )}
      </div>
      <SearchBox key={filters.q} initial={filters.q} onSearch={(q) => void searchFor(q)} />
      <div className="toolbar">
        <button
          type="button"
          className={`${buttonClass({ variant: 'secondary' })} hidden! max-tablet:inline-flex!`}
          aria-expanded={drawerOpen}
          aria-controls="filters"
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="filter" />
          Filters {chips.length > 0 && <span className="count-pill">{chips.length}</span>}
        </button>
        <div className="row sort-row">
          <SortChips sort={sort} onChange={changeSort} />
          <div className="seg" role="group" aria-label="Layout">
            <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
              <Icon name="grid" />
              <span className="sr-only">Grid view</span>
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <Icon name="list" />
              <span className="sr-only">List view</span>
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
          onClear={() => change(EMPTY_FILTERS)}
          resultCount={total}
        />
        <section id="results-region" aria-label="Results">
          {results()}
        </section>
      </div>
    </main>
  );
}
