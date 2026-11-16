import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ViewToggleOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface Props {
  options: ViewToggleOption[];
  value: string;
  onChange: (id: string) => void;
  /** Nombre accesible del grupo ("Vista"). */
  label: string;
  className?: string;
}

/** Alterna entre vistas de un mismo listado (lista, calendario, tablero; mes, semana, día). */
export const CalendarKanbanViewToggle = ({ options, value, onChange, label, className }: Props) => (
  <div
    role="group"
    aria-label={label}
    className={cx('inline-flex rounded-[10px] border border-outline bg-surface-sunken p-0.5', className)}
  >
    {options.map((option) => {
      const active = option.id === value;
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option.id)}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            active ? 'bg-surface text-ink shadow-control' : 'text-muted hover:text-ink',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      );
    })}
  </div>
);
