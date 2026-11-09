import type {
  HTMLAttributes,
  HTMLInputAutoCompleteAttribute,
  HTMLInputTypeAttribute,
  ReactNode,
} from 'react';
import { Icon } from './Icon';
import { tNode } from '../i18n';

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
  /** Makes the field a text area with this many rows. */
  rows?: number;
  maxLength?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
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
  rows,
  maxLength,
  inputMode,
  trailing,
}: FieldProps) {
  const describedBy = error ? `${id}-err` : help ? `${id}-help` : undefined;

  const shared = {
    id,
    name: id,
    value,
    placeholder,
    maxLength,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
  };

  const input = rows ? (
    <textarea
      className="textarea"
      rows={rows}
      {...shared}
      onChange={(event) => onChange(event.target.value)}
    />
  ) : (
    <input
      className="input"
      type={type}
      autoComplete={autoComplete}
      inputMode={inputMode}
      {...shared}
      onChange={(event) => onChange(event.target.value)}
    />
  );

  return (
    <div className={error ? 'field has-error' : 'field'}>
      <label htmlFor={id}>
        {tNode(label)}
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
          {tNode(input)}
          {tNode(trailing)}
        </div>
      ) : (
        input
      )}
      {error ? (
        <p className="err-msg" id={`${id}-err`}>
          <Icon name="alert" />
          {tNode(error)}
        </p>
      ) : (
        help && (
          <p className="t-help" id={`${id}-help`}>
            {tNode(help)}
          </p>
        )
      )}
    </div>
  );
}
