import {
  DISTANCE_SLIDER,
  EMPTY_FILTERS,
  FILTER_BUDGETS,
  FILTER_DISTANCES,
  RENT_SLIDER,
  ROOM_TYPE_LABELS,
  roomTypeSchema,
  type Layout,
  type RoomType,
  type RoomsFilter,
  type SearchFilters,
} from '@urcst/shared';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { formatNumber } from '../lib/format';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useFilterCounts, useLocations } from '../student/queries';
import { withBudget, withDistance } from '../student/filters';
import { Button } from './Button';
import { Icon } from './Icon';
import { t, tNode } from '../i18n';

const BUDGETS = [
  { value: 'any', label: 'Any' },
  ...FILTER_BUDGETS.map((budget) => ({
    value: String(budget),
    label: `Up to ${formatNumber(budget)}`,
  })),
];

const DISTANCES = [
  ...FILTER_DISTANCES.map((distance) => ({
    value: String(distance),
    label: `Within ${distance} km`,
  })),
  { value: 'any', label: 'Any distance' },
];

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'self', label: 'Self-contained' },
  { value: 'shared', label: 'Shared facilities' },
];

const FACILITIES = [
  { key: 'water', label: 'Water' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'privateBath', label: 'Private bathroom' },
  { key: 'security', label: 'Security / guard' },
] as const;

const ROOMS: { value: RoomsFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1 room' },
  { value: '2', label: '2 or more' },
];

const AVAILABILITY = [
  { value: 'all', label: 'All rooms' },
  { value: 'available', label: 'Available only' },
];

type Counts = Record<string, number> | undefined;

function FilterOption({
  type,
  name,
  label,
  count,
  checked,
  onChange,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  label: string;
  count: number | undefined;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-base text-ink has-checked:font-semibold max-tablet:min-h-11 pointer-coarse:min-h-11">
      <input
        className="size-4 flex-none cursor-pointer accent-blue"
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span>
        {tNode(label)}
        {count !== undefined && (
          <span className="num font-normal text-muted"> ({formatNumber(count)})</span>
        )}
      </span>
    </label>
  );
}

function FilterSection({
  id,
  title,
  role = 'group',
  children,
}: {
  id: string;
  title: string;
  role?: 'group' | 'radiogroup';
  children: ReactNode;
}) {
  return (
    <div
      className="border-t border-line py-3 first:border-t-0"
      role={role}
      aria-labelledby={`f-${id}`}
    >
      <h3 className="mb-1 text-base font-bold text-ink" id={`f-${id}`}>
        {tNode(title)}
      </h3>
      {children}
    </div>
  );
}

function RadioList<Value extends string>({
  name,
  options,
  value,
  counts,
  onChange,
}: {
  name: string;
  options: { value: Value; label: string }[];
  value: string | undefined;
  counts: Counts;
  onChange: (value: Value) => void;
}) {
  return options.map((option) => (
    <FilterOption
      key={option.value}
      type="radio"
      name={name}
      label={option.label}
      count={counts?.[option.value]}
      checked={value === option.value}
      onChange={() => onChange(option.value)}
    />
  ));
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

interface FiltersPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters, message?: string) => void;
  /** On phones the panel opens as a drawer. */
  open: boolean;
  onClose: () => void;
  onClear: () => void;
}

export function FiltersPanel({ filters, onChange, open, onClose, onClear }: FiltersPanelProps) {
  const panel = useRef<HTMLElement>(null);
  const { data: locations = [] } = useLocations();

  // Choices wait here until Apply Filters. A change from elsewhere, such as a removed chip,
  // replaces them.
  const [draft, setDraft] = useState(filters);
  const applied = JSON.stringify(filters);
  const [seen, setSeen] = useState(applied);
  if (seen !== applied) {
    setSeen(applied);
    setDraft(filters);
  }
  const { data: counts } = useFilterCounts(draft);

  const area = locations.find(({ name }) => name.toLowerCase() === draft.q.toLowerCase());
  const budget =
    draft.minRent !== undefined
      ? undefined
      : draft.maxRent === undefined
        ? 'any'
        : BUDGETS.find(({ value }) => value === String(draft.maxRent))?.value;
  const distance =
    draft.maxDistance === undefined
      ? 'any'
      : DISTANCES.find(({ value }) => value === String(draft.maxDistance))?.value;
  const low = draft.minRent ?? RENT_SLIDER.min;
  const high = draft.maxRent ?? RENT_SLIDER.max;
  const reach = draft.maxDistance ?? DISTANCE_SLIDER.max;

  function toggleType(type: RoomType) {
    setDraft((current) => ({
      ...current,
      types: current.types.includes(type)
        ? current.types.filter((item) => item !== type)
        : [...current.types, type],
    }));
  }

  function apply() {
    onChange(draft, 'Filters applied.');
    onClose();
  }

  function reset() {
    setDraft(EMPTY_FILTERS);
    onClear();
  }

  return (
    <>
      <aside
        ref={panel}
        className={open ? 'filters open' : 'filters'}
        id="filters"
        aria-label={t('Filters')}
        {...(open ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-lg font-bold text-ink">{t('Filters')}</h2>
          <div className="row">
            <button type="button" className="link-btn" onClick={reset}>
              {t('Clear all')}
            </button>
            <button
              type="button"
              className="icon-btn mobile-filter-btn"
              aria-label={t('Close filters')}
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 max-tablet:flex-1">
          <FilterSection id="area" title={t('Neighbourhood')} role="radiogroup">
            <RadioList
              name="area"
              options={[
                { value: '', label: 'Any' },
                ...locations.map(({ name }) => ({ value: name, label: name })),
              ]}
              value={draft.q ? area?.name : ''}
              counts={counts?.areas}
              onChange={(q) => setDraft((current) => ({ ...current, q }))}
            />
          </FilterSection>
          <FilterSection id="budget" title={t('Monthly budget (RWF)')} role="radiogroup">
            <RadioList
              name="budget"
              options={BUDGETS}
              value={budget}
              counts={counts?.budgets}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  minRent: undefined,
                  maxRent: value === 'any' ? undefined : Number(value),
                }))
              }
            />
            <details className="fine" open={budget === undefined ? true : undefined}>
              <summary>{t('Set an exact range')}</summary>
              <label htmlFor="f-min" className="t-support">
                {t('Minimum')}
              </label>
              <input
                type="range"
                id="f-min"
                min={RENT_SLIDER.min}
                max={RENT_SLIDER.max}
                step={RENT_SLIDER.step}
                value={low}
                aria-valuetext={t('{p0} RWF', { p0: formatNumber(low) })}
                onChange={(event) => {
                  const minRent = Number(event.target.value);
                  setDraft((current) => ({
                    ...current,
                    minRent: minRent <= RENT_SLIDER.min ? undefined : minRent,
                  }));
                }}
              />
              <label htmlFor="f-max" className="t-support">
                {t('Maximum')}
              </label>
              <input
                type="range"
                id="f-max"
                min={RENT_SLIDER.min}
                max={RENT_SLIDER.max}
                step={RENT_SLIDER.step}
                value={high}
                aria-valuetext={t('{p0} RWF', { p0: formatNumber(high) })}
                onChange={(event) => {
                  const maxRent = Number(event.target.value);
                  setDraft((current) => withBudget(current, maxRent));
                }}
              />
              <div className="range-out">
                <span>
                  {t('From')} <b className="num">{formatNumber(low)}</b>
                </span>
                <span>
                  {t('To')} <b className="num">{formatNumber(high)}</b>
                </span>
              </div>
            </details>
          </FilterSection>
          <FilterSection id="distance" title={t('Distance from UR-CST')} role="radiogroup">
            <RadioList
              name="distance"
              options={DISTANCES}
              value={distance}
              counts={counts?.distances}
              onChange={(value) =>
                setDraft((current) =>
                  withDistance(current, value === 'any' ? DISTANCE_SLIDER.max : Number(value)),
                )
              }
            />
            <details className="fine" open={distance === undefined ? true : undefined}>
              <summary>{t('Set an exact distance')}</summary>
              <input
                type="range"
                min={DISTANCE_SLIDER.min}
                max={DISTANCE_SLIDER.max}
                step={DISTANCE_SLIDER.step}
                value={reach}
                aria-label={t('Distance in kilometres')}
                aria-valuetext={t('Within {reach} kilometres', { reach })}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraft((current) => withDistance(current, value));
                }}
              />
              <div className="range-out">
                <span>
                  {tNode(DISTANCE_SLIDER.min)} {t('km')}
                </span>
                <span>
                  {t('Within')} <b className="num">{tNode(reach)}</b> {t('km')}
                </span>
              </div>
            </details>
          </FilterSection>
          <FilterSection id="types" title={t('Room type')}>
            {roomTypeSchema.options.map((type) => (
              <FilterOption
                key={type}
                type="checkbox"
                name="types"
                label={ROOM_TYPE_LABELS[type]}
                count={counts?.types[type]}
                checked={draft.types.includes(type)}
                onChange={() => toggleType(type)}
              />
            ))}
          </FilterSection>
          <FilterSection id="layout" title={t('Kitchen & bathroom layout')} role="radiogroup">
            <RadioList
              name="layout"
              options={LAYOUTS}
              value={draft.layout}
              counts={counts?.layouts}
              onChange={(layout) => setDraft((current) => ({ ...current, layout }))}
            />
          </FilterSection>
          <FilterSection id="must" title={t('Facilities')}>
            {FACILITIES.map(({ key, label }) => (
              <FilterOption
                key={key}
                type="checkbox"
                name={key}
                label={label}
                count={counts?.facilities[key]}
                checked={draft[key]}
                onChange={() => setDraft((current) => ({ ...current, [key]: !current[key] }))}
              />
            ))}
          </FilterSection>
          <FilterSection id="rooms" title={t('Number of rooms')} role="radiogroup">
            <RadioList
              name="rooms"
              options={ROOMS}
              value={draft.rooms}
              counts={counts?.rooms}
              onChange={(rooms) => setDraft((current) => ({ ...current, rooms }))}
            />
          </FilterSection>
          <FilterSection id="availability" title={t('Availability')} role="radiogroup">
            <RadioList
              name="availability"
              options={AVAILABILITY}
              value={draft.availableOnly ? 'available' : 'all'}
              counts={counts?.availability}
              onChange={(value) =>
                setDraft((current) => ({ ...current, availableOnly: value === 'available' }))
              }
            />
          </FilterSection>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
          <Button onClick={apply}>{t('Apply Filters')}</Button>
          <Button variant="outline" onClick={reset}>
            {t('Reset')}
          </Button>
        </div>
      </aside>
      {open && (
        <>
          <FocusTrap panel={panel} onClose={onClose} />
          {/* The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className="filter-backdrop" onClick={onClose} />
        </>
      )}
    </>
  );
}
