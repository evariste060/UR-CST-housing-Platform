import type { HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute, ReactNode } from 'react';
import { Icon } from './Icon';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  help?: string;
  required?: boolean;
  error?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  /** Lets PasswordField add its show/hide button next to the input. */
  trailing?: ReactNode;
}

export function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  help,
  required = false,
  error,
  autoComplete,
  trailing,
}: FieldProps) {
  const describedBy = error ? `${id}-err` : help ? `${id}-help` : undefined;

  const input = (
    <input
      className="input"
      id={id}
      name={id}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );

  return (
    <div className={error ? 'field has-error' : 'field'}>
      <label htmlFor={id}>
        {label}
        {required && (
          <>
            {' '}
            <span className="req" aria-hidden="true">
              *
            </span>
          </>
        )}
      </label>
      {trailing ? (
        <div className="input-wrap">
          {input}
          {trailing}
        </div>
      ) : (
        input
      )}
      {error ? (
        <p className="err-msg" id={`${id}-err`}>
          <Icon name="alert" />
          {error}
        </p>
      ) : (
        help && (
          <p className="t-help" id={`${id}-help`}>
            {help}
          </p>
        )
      )}
    </div>
  );
}
