import type { ReactNode } from 'react';
import { Card } from './Card';
import { cx } from './cx';

export interface CoverStat {
  label: string;
  /** Ya formateado (moneda, fecha, cantidad). */
  value: string;
  hint?: string;
}

interface Props {
  /** El avatar o ícono de la ficha; se apoya sobre el borde inferior de la portada. */
  avatar: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Etiquetas de estado al lado del título. */
  badges?: ReactNode;
  actions?: ReactNode;
  /** Indicadores clave de la ficha, en una franja bajo la identidad. */
  stats?: CoverStat[];
  /** Las pestañas de la ficha, pegadas al pie de la portada. */
  children?: ReactNode;
}

/**
 * Cabecera de una ficha (modelo de `profile-cover` de Minimal): portada con el degradé de la marca,
 * identidad, acciones, KPIs y las pestañas al pie.
 */
export const PageCover = ({ avatar, title, subtitle, badges, actions, stats, children }: Props) => (
  <Card className="mb-6 overflow-hidden">
    <div aria-hidden="true" className="h-24 bg-gradient-to-br from-primary-from to-primary-to sm:h-28" />
    <div className="px-5 pb-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-4">
          <span className="-mt-9 grid shrink-0 place-items-center rounded-full bg-surface p-1 shadow-card">
            {avatar}
          </span>
          <div className="min-w-0 pt-2.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-ink sm:text-xl">{title}</h2>
              {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
            </div>
            {subtitle && <div className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 pt-2.5">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <dl
          className={cx(
            'mt-5 grid grid-cols-2 gap-3 border-t border-outline-soft pt-4',
            stats.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
            stats.length >= 4 && 'lg:grid-cols-4',
          )}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-xl bg-surface-hover px-3.5 py-2.5">
              <dt className="text-xs font-medium text-muted">{stat.label}</dt>
              <dd className="mt-0.5 break-words font-mono text-[15px] font-semibold text-ink sm:text-[17px]">
                {stat.value}
              </dd>
              {stat.hint && <p className="text-[11.5px] text-muted [overflow-wrap:anywhere]">{stat.hint}</p>}
            </div>
          ))}
        </dl>
      )}
    </div>
    {children && <div className="border-t border-outline px-3 sm:px-4">{children}</div>}
  </Card>
);
