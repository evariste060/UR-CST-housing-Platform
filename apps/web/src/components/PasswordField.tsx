import { useState, type ComponentProps } from 'react';
import { Field } from './Field';
import { Icon } from './Icon';
import { t } from '../i18n';

type PasswordFieldProps = Omit<ComponentProps<typeof Field>, 'type' | 'trailing'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="icon-btn"
          aria-label={visible ? t('Hide password') : t('Show password')}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          <Icon name={visible ? 'eyeoff' : 'eye'} />
        </button>
      }
    />
  );
}
