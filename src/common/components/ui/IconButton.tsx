import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from '@mui/material';
import { cx } from './cx';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatoria: es el nombre accesible y el texto del tooltip. */
  label: string;
  icon: ReactNode;
  tone?: 'neutral' | 'danger';
  /** Botón de dos estados (vista lista/grilla): `true` lo marca activo y lo anuncia con `aria-pressed`. */
  active?: boolean;
}

/** Botón sólo con ícono. Sin `label` no compila: un ícono solo no es accesible. */
export const IconButton = forwardRef<HTMLButtonElement, Props>(
  ({ label, icon, tone = 'neutral', active, className, type = 'button', ...rest }, ref) => (
    <Tooltip title={label}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-control transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-[17px] [&_svg]:w-[17px]',
          active ? 'border-primary-edge bg-primary/10 text-primary' : 'border-outline bg-surface',
          tone === 'danger'
            ? 'text-danger hover:border-danger/30 hover:bg-danger-soft'
            : !active && 'text-ink-2 hover:bg-surface-hover hover:text-ink',
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    </Tooltip>
  ),
);
IconButton.displayName = 'IconButton';
