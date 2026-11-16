import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Card } from './Card';
import { cx } from './cx';
import { isZeroValue } from './kpiValue';
import { Skeleton } from './Skeleton';

export type KpiTrend = 'up' | 'down' | 'warn' | 'neutral';

const TREND: Record<KpiTrend, string> = {
  up: 'bg-success-soft text-success',
  down: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
  neutral: 'bg-surface-muted text-ink-2',
};

interface Props {
  title: string;
  icon: LucideIcon;
  value: string;
  loading?: boolean;
  /** Tendencia o gráfico chico a la derecha del valor. */
  aside?: ReactNode;
  /** Píldora del pie: la variación contra el período anterior, o un aviso. */
  pill?: { text: string; trend: KpiTrend };
  hint?: string;
}

/**
 * Un indicador: ícono, título y el valor en la letra del sistema con cifras tabulares (28 px; 20 px en el celular,
 * donde van de a dos). Un valor en cero va apagado. El pie (variación o aclaración) sólo ocupa lugar si hay algo.
 */
export const KpiCard = ({ title, icon: Icon, value, loading = false, aside, pill, hint }: Props) => {
  const zero = !loading && isZeroValue(value);
  return (
    <Card className="flex min-h-[80px] min-w-0 flex-col justify-between gap-2 p-3 sm:min-h-[96px] sm:p-4">
      <div className="truncate text-[12.5px] font-medium leading-5 text-muted sm:leading-7" title={title}>
        <span className="mr-2 hidden h-7 w-7 place-items-center rounded-lg border border-outline-soft bg-bg align-middle text-ink-2 sm:inline-grid">
          <Icon aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.8} />
        </span>
        {title}
      </div>
      <div className="flex min-w-0 items-end justify-between gap-2.5">
        {loading ? (
          <Skeleton className="h-7 w-28 max-w-full" />
        ) : (
          <strong
            data-zero={zero || undefined}
            title={value}
            className={cx(
              'min-w-0 truncate text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums sm:text-[28px]',
              zero ? 'text-muted' : 'text-ink',
            )}
          >
            {value}
          </strong>
        )}
        {!loading && aside}
      </div>
      {(pill || hint) && (
        <div className="flex min-w-0 items-center justify-between gap-2 text-[11.5px] text-muted">
          {pill && !loading ? (
            <span className={cx('shrink-0 rounded-full px-[7px] py-0.5 font-semibold', TREND[pill.trend])}>
              {pill.text}
            </span>
          ) : (
            <span />
          )}
          {hint && <span className="truncate text-right">{hint}</span>}
        </div>
      )}
    </Card>
  );
};

interface GridProps extends HTMLAttributes<HTMLElement> {
  /** Nombre del grupo: con él se dibuja como `section` con su `aria-label`. */
  label?: string;
}

/**
 * Grilla de indicadores: de a dos en el celular (si queda uno suelto ocupa la fila entera); en pantallas más anchas,
 * las columnas que pida la pantalla con `className` (`sm:grid-cols-3`, `lg:grid-cols-4`…).
 */
export const KpiGrid = ({ label, className, children, ...rest }: GridProps) => {
  const classes = cx('grid grid-cols-2 gap-3 sm:gap-4 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2', className);
  return label ? (
    <section aria-label={label} className={classes} {...rest}>
      {children}
    </section>
  ) : (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};
