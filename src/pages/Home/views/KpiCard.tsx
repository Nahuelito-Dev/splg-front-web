import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../../../common/components/ui';
import { cx } from '../../../common/components/ui/cx';

export type Trend = 'up' | 'down' | 'warn' | 'neutral';

const TREND: Record<Trend, string> = {
  up: 'bg-success-soft text-success',
  down: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
  neutral: 'bg-tinta-100 text-tinta-700',
};

interface Props {
  title: string;
  icon: LucideIcon;
  value: string;
  loading?: boolean;
  /** Tendencia o gráfico chico a la derecha del valor. */
  aside?: ReactNode;
  /** Píldora del pie: una variación o un aviso. */
  pill?: { text: string; trend: Trend };
  hint?: string;
}

/** Un indicador del tablero: ícono, título, valor en cifras tabulares y un pie con contexto. */
export const KpiCard = ({ title, icon: Icon, value, loading = false, aside, pill, hint }: Props) => (
  <Card className="grid gap-2.5 px-[18px] pb-3.5 pt-4">
    <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
      <span className="grid h-7 w-7 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2">
        <Icon aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.8} />
      </span>
      {title}
    </div>
    <div className="flex items-end justify-between gap-2.5">
      {loading ? (
        <span className="h-7 w-28 animate-pulse rounded-md bg-tinta-100" />
      ) : (
        <strong className="whitespace-nowrap font-mono text-[25px] font-semibold leading-none tracking-[-0.03em] text-ink">
          {value}
        </strong>
      )}
      {!loading && aside}
    </div>
    <div className="flex min-h-[22px] items-center justify-between gap-2 text-[11.5px] text-faint">
      {pill && !loading ? (
        <span className={cx('rounded-full px-[7px] py-0.5 font-semibold', TREND[pill.trend])}>{pill.text}</span>
      ) : (
        <span />
      )}
      {hint && <span className="truncate text-right">{hint}</span>}
    </div>
  </Card>
);
