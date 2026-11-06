import {
  DISTANCE_SLIDER,
  RENT_SLIDER,
  ROOM_TYPE_LABELS,
  type Layout,
  type RoomType,
  type RoomsFilter,
  type SearchFilters,
} from '@urcst/shared';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { formatNumber } from '../lib/format';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useLocations } from '../student/queries';
import { withBudget, withDistance } from '../student/filters';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { PickGroup, ToggleChip } from './PickGroup';
import { ToggleTile } from './ToggleTile';

const SLIDER_DELAY_MS = 200;

const BUDGETS = [
  { value: 'any', label: 'Any' },
  { value: '50000', label: 'Up to 50,000' },
  { value: '75000', label: 'Up to 75,000' },
  { value: '100000', label: 'Up to 100,000' },
  { value: '150000', label: 'Up to 150,000' },
];

const DISTANCES = [
  { value: '1', label: 'Within 1 km', icon: 'pin' as IconName },
  { value: '2', label: 'Within 2 km', icon: 'pin' as IconName },
  { value: '3', label: 'Within 3 km', icon: 'pin' as IconName },
  { value: 'any', label: 'Any distance', icon: 'route' as IconName },
];

const ROOM_TYPES: { type: RoomType; icon: IconName }[] = [
  { type: 'SINGLE', icon: 'bed' },
  { type: 'SHARED', icon: 'users' },
  { type: 'STUDIO', icon: 'door' },
  { type: 'APARTMENT', icon: 'building' },
];

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'self', label: 'Self-contained' },
  { value: 'shared', label: 'Shared facilities' },
];

const FACILITIES = [
  { key: 'water', label: 'Water', icon: 'water' },
  { key: 'electricity', label: 'Electricity', icon: 'bolt' },
  { key: 'privateBath', label: 'Private bathroom', icon: 'bath' },
  { key: 'security', label: 'Security / guard', icon: 'shield' },
] as const;

const ROOMS: { value: RoomsFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1 room' },
  { value: '2', label: '2 or more' },
];

/** Follows the page, but holds a dragged slider back until it settles. */
function useSlider(value: number, commit: (value: number) => void) {
  const [draft, setDraft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(next: number) {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      commit(next);
      setDraft(null);
    }, SLIDER_DELAY_MS);
  }

  return [draft ?? value, onChange] as const;
}

interface FilterProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

function BudgetFilter({ filters, onChange }: FilterProps) {
  const low = filters.minRent ?? RENT_SLIDER.min;
  const high = filters.maxRent ?? RENT_SLIDER.max;
  const [min, setMin] = useSlider(low, (minRent) =>
    onChange({ ...filters, minRent: minRent <= RENT_SLIDER.min ? undefined : minRent }),
  );
  const [max, setMax] = useSlider(high, (maxRent) => onChange(withBudget(filters, maxRent)));

  const preset =
    filters.minRent !== undefined
      ? undefined
      : filters.maxRent === undefined
        ? 'any'
        : BUDGETS.find(({ value }) => value === String(filters.maxRent))?.value;

  return (
    <div className="filter-group">
      <PickGroup
        label="Monthly budget (RWF)"
        value={preset}
        options={BUDGETS}
        none={`${formatNumber(low)} to ${formatNumber(high)}`}
        compact
        onChange={(value) =>
          onChange({
            ...filters,
            minRent: undefined,
            maxRent: value === 'any' ? undefined : Number(value),
          })
        }
      />
      <details className="fine" open={preset === undefined ? true : undefined}>
        <summary>Set an exact range</summary>
        <label htmlFor="f-min" className="t-support">
          Minimum
        </label>
        <input
          type="range"
          id="f-min"
          min={RENT_SLIDER.min}
          max={RENT_SLIDER.max}
          step={RENT_SLIDER.step}
          value={min}
          aria-valuetext={`${formatNumber(min)} RWF`}
          onChange={(event) => setMin(Number(event.target.value))}
        />
        <label htmlFor="f-max" className="t-support">
          Maximum
        </label>
        <input
          type="range"
          id="f-max"
          min={RENT_SLIDER.min}
          max={RENT_SLIDER.max}
          step={RENT_SLIDER.step}
          value={max}
          aria-valuetext={`${formatNumber(max)} RWF`}
          onChange={(event) => setMax(Number(event.target.value))}
        />
        <div className="range-out">
          <span>
            From <b className="num">{formatNumber(min)}</b>
          </span>
          <span>
            To <b className="num">{formatNumber(max)}</b>
          </span>
        </div>
      </details>
    </div>
  );
}

function DistanceFilter({ filters, onChange }: FilterProps) {
  const current = filters.maxDistance ?? DISTANCE_SLIDER.max;
  const [distance, setDistance] = useSlider(current, (value) =>
    onChange(withDistance(filters, value)),
  );
  const preset =
    filters.maxDistance === undefined
      ? 'any'
      : DISTANCES.find(({ value }) => value === String(filters.maxDistance))?.value;

  return (
    <div className="filter-group">
      <PickGroup
        label="Distance from UR-CST"
        value={preset}
        options={DISTANCES}
        none={`Within ${current} km`}
        compact
        onChange={(value) =>
          onChange(withDistance(filters, value === 'any' ? DISTANCE_SLIDER.max : Number(value)))
        }
      />
      <details className="fine" open={preset === undefined ? true : undefined}>
        <summary>Set an exact distance</summary>
        <input
          type="range"
          min={DISTANCE_SLIDER.min}
          max={DISTANCE_SLIDER.max}
          step={DISTANCE_SLIDER.step}
          value={distance}
          aria-label="Distance in kilometres"
          aria-valuetext={`Within ${distance} kilometres`}
          onChange={(event) => setDistance(Number(event.target.value))}
        />
        <div className="range-out">
          <span>{DISTANCE_SLIDER.min} km</span>
          <span>
            Within <b className="num">{distance}</b> km
          </span>
        </div>
      </details>
    </div>
  );
}

function FocusTrap({
  panel,
  onClose,
}: {
  panel: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  useFocusTrap(panel, { onEscape: onClose });
  return null;
}

interface FiltersPanelProps extends FilterProps {
  /** On phones the panel opens as a drawer. */
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  resultCount: number | undefined;
}

export function FiltersPanel({
  filters,
  onChange,
  open,
  onClose,
  onClear,
  resultCount,
}: FiltersPanelProps) {
  const panel = useRef<HTMLElement>(null);
  const { data: locations = [] } = useLocations();
  const q = filters.q.toLowerCase();
  const area = locations.find(({ name }) => name.toLowerCase() === q);
  const required = FACILITIES.filter(({ key }) => filters[key]).map(({ label }) => label);

  function toggleType(type: RoomType) {
    const types = filters.types.includes(type)
      ? filters.types.filter((item) => item !== type)
      : [...filters.types, type];
    onChange({ ...filters, types });
  }

  return (
    <>
      <aside
        ref={panel}
        className={open ? 'filters open' : 'filters'}
        id="filters"
        aria-label="Filters"
        {...(open ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="filter-head">
          <h2 className="t-card">
            <Icon name="filter" /> Filters
          </h2>
          <div className="row">
            <button type="button" className="link-btn" onClick={onClear}>
              Clear all
            </button>
            <button
              type="button"
              className="icon-btn mobile-filter-btn"
              aria-label="Close filters"
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          </div>
        </div>
        <p className="tip filter-tip">
          <Icon name="hand" />
          Tap to choose. Blue with a tick means it is selected.
        </p>
        <div className="filter-group">
          <PickGroup
            label="Neighbourhood"
            value={filters.q ? area?.name : ''}
            options={[
              { value: '', label: 'Any', icon: 'map' },
              ...locations.map(({ name }) => ({ value: name, label: name })),
            ]}
            none={`"${filters.q}"`}
            compact
            onChange={(value) => onChange({ ...filters, q: value })}
          />
        </div>
        <BudgetFilter filters={filters} onChange={onChange} />
        <DistanceFilter filters={filters} onChange={onChange} />
        <div className="filter-group" role="group" aria-labelledby="f-types">
          <div className="pick-head">
            <span className="t-label" id="f-types">
              Room type
            </span>
            <span className="picked" aria-live="polite">
              Selected:{' '}
              <b>
                {filters.types.length
                  ? filters.types.map((type) => ROOM_TYPE_LABELS[type]).join(', ')
                  : 'Any type'}
              </b>
            </span>
          </div>
          <p className="t-help filter-help">You can pick more than one.</p>
          <div className="chipset">
            {ROOM_TYPES.map(({ type, icon }) => (
              <ToggleChip
                key={type}
                label={ROOM_TYPE_LABELS[type]}
                icon={icon}
                pressed={filters.types.includes(type)}
                onToggle={() => toggleType(type)}
              />
            ))}
          </div>
        </div>
        <div className="filter-group">
          <PickGroup
            label="Kitchen & bathroom layout"
            value={filters.layout}
            options={LAYOUTS}
            compact
            onChange={(layout) => onChange({ ...filters, layout })}
          />
        </div>
        <div className="filter-group" role="group" aria-labelledby="f-must">
          <div className="pick-head">
            <span className="t-label" id="f-must">
              Must include
            </span>
            <span className="picked" aria-live="polite">
              Selected: <b>{required.length ? required.join(', ') : 'Nothing required'}</b>
            </span>
          </div>
          <div className="tilegrid">
            {FACILITIES.map(({ key, label, icon }) => (
              <ToggleTile
                key={key}
                label={label}
                icon={icon}
                pressed={filters[key]}
                onToggle={() => onChange({ ...filters, [key]: !filters[key] })}
              />
            ))}
          </div>
        </div>
        <div className="filter-group">
          <PickGroup
            label="Number of rooms"
            value={filters.rooms}
            options={ROOMS}
            compact
            onChange={(rooms) => onChange({ ...filters, rooms })}
          />
        </div>
        <div className="filter-group filter-last">
          <PickGroup
            label="Availability"
            value={filters.availableOnly ? 'available' : 'all'}
            options={[
              { value: 'all', label: 'All rooms' },
              { value: 'available', label: 'Available only', icon: 'check' },
            ]}
            compact
            onChange={(value) => onChange({ ...filters, availableOnly: value === 'available' })}
          />
        </div>
      </aside>
      {open && (
        <>
          <FocusTrap panel={panel} onClose={onClose} />
          {/* The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className="filter-backdrop" onClick={onClose} />
          <div className="filter-drawer-foot">
            <Button variant="secondary" onClick={onClear}>
              Clear all
            </Button>
            <Button onClick={onClose}>
              {resultCount === undefined ? 'Show results' : `Show ${resultCount} results`}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
