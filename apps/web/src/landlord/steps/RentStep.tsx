import type { Availability, ListingDraft } from '@urcst/shared';
import { Field } from '../../components/Field';
import { Icon, type IconName } from '../../components/Icon';
import { PickGroup } from '../../components/PickGroup';
import { formatNumber } from '../../lib/format';
import type { StepProps } from './stepProps';

const MAX_RENT_DIGITS = 8;

const AMOUNTS = [40_000, 60_000, 80_000, 100_000, 150_000].map((amount) => ({
  value: String(amount),
  label: formatNumber(amount),
}));

const AVAILABILITY: { value: Availability; label: string; icon: IconName }[] = [
  { value: 'AVAILABLE', label: 'Available', icon: 'check' },
  { value: 'OCCUPIED', label: 'Occupied', icon: 'door' },
];

const INCLUDED: { key: 'water' | 'electricity' | 'security'; icon: IconName; label: string }[] = [
  { key: 'water', icon: 'water', label: 'Water included' },
  { key: 'electricity', icon: 'bolt', label: 'Electricity included' },
  { key: 'security', icon: 'shield', label: 'Security guard / locked gate' },
];

const BATHROOM: { value: ListingDraft['bathroom']; label: string }[] = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'SHARED', label: 'Shared' },
];

const FACILITIES = [
  { value: 'self', label: 'Self-contained' },
  { value: 'shared', label: 'Shared' },
] as const;

export function RentStep({ values, errors, change }: StepProps) {
  const { rentRwf } = values;

  return (
    <div className="form-grid">
      <Field
        id="wz-rent"
        label="Monthly rent (RWF)"
        value={rentRwf ? formatNumber(rentRwf) : ''}
        placeholder="e.g. 80,000"
        inputMode="numeric"
        required
        error={errors.rentRwf}
        help="Type the amount, or tap a common amount below."
        onChange={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, MAX_RENT_DIGITS);
          change({ rentRwf: digits ? Number(digits) : null });
        }}
      />
      <PickGroup
        label="Common amounts"
        value={String(rentRwf)}
        options={AMOUNTS}
        none={rentRwf ? 'Your own amount' : 'Nothing yet'}
        compact
        onChange={(amount) => change({ rentRwf: Number(amount) })}
      />
      <div className="full">
        <PickGroup
          label="Current availability"
          value={values.availability}
          options={AVAILABILITY}
          compact
          onChange={(availability) => change({ availability })}
        />
      </div>
      <fieldset className="full wizard-included">
        <legend className="t-label">What is included?</legend>
        <div className="choice-grid">
          {INCLUDED.map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              className="choice"
              aria-pressed={values[key]}
              onClick={() => change({ [key]: !values[key] })}
            >
              <Icon name={values[key] ? 'check' : icon} />
              <span>
                <b>{label}</b>
                <span className="t-support choice-text">{values[key] ? 'Yes' : 'No'}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <PickGroup
        label="Bathroom"
        value={values.bathroom}
        options={BATHROOM}
        compact
        onChange={(bathroom) => change({ bathroom })}
      />
      <PickGroup
        label="Kitchen and facilities"
        value={values.selfContained ? 'self' : 'shared'}
        options={[...FACILITIES]}
        compact
        onChange={(value) => change({ selfContained: value === 'self' })}
      />
    </div>
  );
}
