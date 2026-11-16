import { CircleCheck, Inbox, SearchX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import type { EmptyVariant } from './EmptyIllustration';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Ícono del círculo; sin él, el de `illustration`. */
  icon?: LucideIcon;
  /** Qué ícono por defecto: `box` (sin datos), `search` (sin resultados) o `done` (todo en orden). */
  illustration?: EmptyVariant;
  /** Versión chica, sin ícono, para secciones de una ficha y columnas de un tablero. */
  compact?: boolean;
}

const VARIANT_ICON: Record<EmptyVariant, LucideIcon> = { box: Inbox, search: SearchX, done: CircleCheck };

/**
 * El vacío del panel, con un solo estilo: ícono de 40 px en un círculo de 56, título de 16, texto de 14 y una acción
 * opcional. `compact` deja título y texto en una caja de 64 px de alto.
 */
export const EmptyState = ({ title, description, action, icon, illustration = 'box', compact = false }: Props) => {
  const Icon = icon ?? VARIANT_ICON[illustration];
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'min-h-[64px] gap-1 px-4 py-3' : 'gap-3 px-6 py-10',
      )}
    >
      {!compact && (
        <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-surface-muted text-muted">
          <Icon className="h-10 w-10" strokeWidth={1.25} />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className={cx('font-semibold', compact ? 'text-sm text-ink-2' : 'font-display text-base text-ink')}>
          {title}
        </p>
        {description && <p className={cx('max-w-sm text-muted', compact ? 'text-[13px]' : 'text-sm')}>{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
