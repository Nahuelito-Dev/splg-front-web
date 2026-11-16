import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Muestra un indicador y deshabilita el botón. */
  loading?: boolean;
  icon?: ReactNode;
  /**
   * La acción existe pero hoy no se puede: el botón se ve apagado, sigue en el orden de tabulación y el motivo va en
   * `title` y en `aria-description` (un `disabled` nativo no se enfoca y su tooltip no se ve).
   */
  blockedReason?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'border border-primary-edge bg-gradient-to-b from-primary-from to-primary-to text-on-primary shadow-primary hover:brightness-110',
  secondary: 'border border-outline bg-surface text-ink shadow-control hover:bg-surface-hover',
  ghost: 'text-ink-2 hover:bg-surface-muted hover:text-ink',
  danger: 'border border-danger bg-danger text-white shadow-control hover:brightness-110',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 rounded-lg px-3 text-xs',
  md: 'h-[38px] rounded-[10px] px-[15px] text-[13px]',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      className,
      children,
      disabled,
      blockedReason,
      onClick,
      title,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={blockedReason ? true : undefined}
      aria-description={blockedReason}
      title={blockedReason ?? title}
      onClick={blockedReason ? undefined : onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 [&_svg]:h-4 [&_svg]:w-4',
        blockedReason && 'cursor-not-allowed opacity-50 hover:brightness-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
