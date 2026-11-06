import { useId } from 'react';
import { useRovingRadio } from '../lib/useRovingRadio';
import { Icon, type IconName } from './Icon';

interface Choice<T extends string> {
  value: T;
  icon: IconName;
  title: string;
  description: string;
}

interface ChoiceCardsProps<T extends string> {
  options: Choice<T>[];
  onChoose: (value: T) => void;
}

/** Large cards where choosing one moves straight on, such as the account type at registration. */
export function ChoiceCards<T extends string>({ options, onChoose }: ChoiceCardsProps<T>) {
  return (
    <div className="choice-grid">
      {options.map(({ value, icon, title, description }) => (
        <button key={value} type="button" className="choice" onClick={() => onChoose(value)}>
          <Icon name={icon} />
          <span>
            <b>{title}</b>
            <span className="t-support choice-text">{description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

interface ChoiceFieldProps<T extends string> extends ChoiceCardsProps<T> {
  label: string;
  value: T | undefined;
  help?: string;
  error?: string;
  required?: boolean;
}

/** Large pick-one cards that keep the choice, with the "Selected" label and echo. */
export function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChoose,
  help,
  error,
  required = false,
}: ChoiceFieldProps<T>) {
  const labelId = useId();
  const radio = useRovingRadio(
    options.map((option) => option.value),
    value,
    onChoose,
  );
  const selected = options.find((option) => option.value === value);

  return (
    <div className={error ? 'field has-error' : 'field'}>
      <div className="pick-head">
        <span className="label" id={labelId}>
          {label}
          {required && (
            <span className="req" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </span>
        <span className="picked" aria-live="polite">
          {selected && <Icon name="check" />}
          Selected: <b>{selected ? selected.title : 'Nothing yet'}</b>
        </span>
      </div>
      {help && <p className="t-help">{help}</p>}
      <div
        className="choice-grid"
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required={required || undefined}
      >
        {options.map((option) => (
          <button key={option.value} className="choice" {...radio(option.value)}>
            <Icon name={option.value === value ? 'check' : option.icon} />
            <span>
              <b>{option.title}</b>
              <span className="t-support choice-text">{option.description}</span>
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="err-msg">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </div>
  );
}
