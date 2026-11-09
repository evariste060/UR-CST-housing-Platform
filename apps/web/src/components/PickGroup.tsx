import { useId } from 'react';
import { useRovingRadio } from '../lib/useRovingRadio';
import { Icon, type IconName } from './Icon';
import { t, tNode } from '../i18n';

export interface PickOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface PickGroupProps<T extends string> {
  label: string;
  value: T | undefined;
  options: PickOption<T>[];
  onChange: (value: T) => void;
  /** Shown after "Selected:" when nothing is picked. */
  none?: string;
  error?: string;
  compact?: boolean;
  /** Step number shown before the label. */
  step?: number;
}

/** Visible pick-one chips, used instead of a dropdown. */
export function PickGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  none = 'Any',
  error,
  compact = false,
  step,
}: PickGroupProps<T>) {
  const labelId = useId();
  const radio = useRovingRadio(
    options.map((option) => option.value),
    value,
    onChange,
  );
  const selected = options.find((option) => option.value === value);
  const classes = ['pick-group', error && 'has-error', compact && 'compact'];

  return (
    <div className={classes.filter(Boolean).join(' ')}>
      <div className="pick-head">
        <span className="t-label" id={labelId}>
          {step !== undefined && <span className="pick-n">{step}</span>}
          {tNode(label)}
        </span>
        <span className="picked" aria-live="polite">
          {selected && <Icon name="check" />}
          {t('Selected:')} <b>{selected ? selected.label : none}</b>
        </span>
      </div>
      <div className="chipset" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => {
          const on = option.value === value;
          const icon = on ? 'check' : option.icon;
          return (
            <button key={option.value} className="pchip" {...radio(option.value)}>
              {icon && <Icon name={icon} />}
              {tNode(option.label)}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="err-msg">
          <Icon name="alert" />
          {tNode(error)}
        </p>
      )}
    </div>
  );
}

/** A chip that turns on and off, for groups where several can be picked. */
export function ToggleChip({
  label,
  pressed,
  icon,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  icon?: IconName;
  onToggle: () => void;
}) {
  const shown = pressed ? 'check' : icon;
  return (
    <button type="button" className="pchip sm" aria-pressed={pressed} onClick={onToggle}>
      {shown && <Icon name={shown} />}
      {tNode(label)}
    </button>
  );
}
