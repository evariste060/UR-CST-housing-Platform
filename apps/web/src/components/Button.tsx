import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

const VARIANTS = {
  primary: 'bg-blue text-white hover:bg-blue-700 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]',
  secondary: 'border-line-strong bg-card text-ink hover:bg-slate-100 high-contrast:border-ink',
  outline: 'border-[1.5px]! border-blue bg-card text-blue hover:bg-blue-50',
  ghost: 'border-transparent bg-transparent text-blue hover:bg-blue-50',
  success: 'bg-green-text text-white hover:bg-[#166534] dark:bg-[#15803d]',
  danger: 'bg-red-text text-white hover:bg-[#991b1b] dark:bg-[#b91c1c]',
  'danger-outline': 'border-red-border bg-card text-red-text hover:bg-red-50',
  /** For dark bars such as the compare tray. */
  'on-dark': 'border-[#475569] bg-transparent text-white hover:bg-[#1e293b]',
};

const SIZES = {
  md: 'rounded-[10px] px-[18px] py-2.5 text-[0.9375rem]',
  sm: 'rounded-sm px-3 py-1.5 text-sm',
  lg: 'min-h-[52px] rounded-[10px] px-6 py-3 text-base',
};

export type ButtonVariant = keyof typeof VARIANTS;

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: 'sm' | 'lg';
  block?: boolean;
}

/**
 * The classes for a button, also used to make a link look like one.
 * `btn` carries no style of its own: parents use it to adjust the buttons inside them.
 */
export function buttonClass({ variant = 'primary', size = undefined, block }: ButtonStyle = {}) {
  return [
    'btn inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border font-semibold whitespace-nowrap no-underline transition-[background,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 high-contrast:border-2',
    variant === 'primary' || variant === 'success' || variant === 'danger'
      ? 'border-transparent'
      : '',
    VARIANTS[variant],
    SIZES[size ?? 'md'],
    block ? 'w-full' : '',
  ]
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
