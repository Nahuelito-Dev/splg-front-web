import {
  CalendarKanbanViewToggle,
  Card,
  ErrorState,
  Skeleton,
  TrendAreaChart,
  CardHeader,
} from '../../../common/components/ui';
import { useSalesEvolution } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency } from '../../../utils/format';
import { buildTrend, trendPreviousRange, type Granularity } from './salesSeries';

const OPTIONS: { id: Granularity; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

interface Props {
  range: DayRange;
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
}

export const SalesTrend = ({ range, granularity, onGranularityChange }: Props) => {
  const prevRange = trendPreviousRange(range, granularity);
  const current = useSalesEvolution({ ...range, granularity });
  const previous = useSalesEvolution({ ...prevRange, granularity });
  const loading = current.isLoading;
  const points = buildTrend(current.data ?? [], previous.data, range, prevRange, granularity);
  const hasSales = points.some((p) => p.value > 0 || (p.previous ?? 0) > 0);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-2">
        <CardHeader
          title="Ventas en el tiempo"
          subtitle="Facturación del período contra el período anterior."
          className=""
        />
        <CalendarKanbanViewToggle
          label="Agrupar por"
          options={OPTIONS}
          value={granularity}
          onChange={(id) => onGranularityChange(OPTIONS.find((o) => o.id === id)?.id ?? granularity)}
        />
      </div>
      <div className="px-3 pb-4 pt-2 sm:px-5">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : current.error ? (
          <ErrorState error={current.error} onRetry={() => void current.refetch()} />
        ) : !hasSales ? (
          <p className="grid h-[300px] place-items-center text-sm text-muted">Sin ventas en el período.</p>
        ) : (
          <>
            <TrendAreaChart data={points} formatValue={formatCurrency} seriesName="Ventas" />
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-0.5 w-4 rounded bg-primary" /> Período elegido
              </span>
              {previous.data && (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-muted" /> Período anterior
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </Card>
  );
};
