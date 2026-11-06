import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger' | 'danger-outline';

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: 'sm' | 'lg';
  block?: boolean;
}

/** The classes for a button, also used to make a link look like one. */
export function buttonClass({ variant = 'primary', size, block }: ButtonStyle = {}) {
  return ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block']
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonStyle, ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" className={buttonClass({ variant, size, block })} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
});
