import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `primary` is the cobalt call-to-action; only one per view. */
  variant?: ButtonVariant;
  /** `md` is the default. `lg` is for hero and full-width mobile actions. */
  size?: ButtonSize;
  /** Font Awesome class rendered before the label, e.g. `fa-solid fa-plus`. */
  icon?: string;
  /** Stretch to the container's width — the mobile default for form actions. */
  fullWidth?: boolean;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  children?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cobalt text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-cobalt border border-cobalt hover:bg-blue-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  white: 'bg-white text-cobalt shadow-sm hover:bg-blue-50',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

/**
 * The primary action control.
 *
 * Labels never wrap — a button that breaks its own label mid-phrase reads as
 * broken rather than as a button, which is what `whitespace-nowrap` prevents
 * on narrow screens.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <i className="fa-solid fa-spinner animate-spin" aria-hidden />
      ) : icon ? (
        <i className={icon} aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
