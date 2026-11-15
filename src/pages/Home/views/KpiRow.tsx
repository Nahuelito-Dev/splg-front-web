import { Banknote, PackageCheck, Receipt, Timer } from 'lucide-react';
import { KpiCard, type KpiTrend } from '../../../common/components/ui';
import { useOrderStats } from '../../../services/queries/stats';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatCurrency, formatNumber, percentChange } from '../../../utils/format';
import { useSalesSummary } from '../../../services/queries/reports';
import { dayRange, splitWindows } from '../lib/series';
import { useDailySales } from '../lib/useDailySales';
import { Sparkline } from './Sparkline';
import { StackedBar } from './StackedBar';

const compactMoney = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const trendOf = (change: number): KpiTrend => (change >= 0 ? 'up' : 'down');

const pillOf = (change: number | null) =>
  change === null
    ? undefined
    : { text: `${change >= 0 ? '↑' : '↓'} ${formatNumber(Math.abs(change))} %`, trend: trendOf(change) };

/**
 * Los cuatro indicadores de arriba. Los valores en vivo salen de
 * GET /orders/stats/summary; las tendencias y los gráficos chicos, de
 * GET /reports/sales-evolution (pedidos entregados por día): hoy contra ayer y
 * los últimos 30 días contra los 30 anteriores.
 */
export const KpiRow = () => {
  const palette = useChartPalette();
  const { data: stats, isLoading: statsLoading } = useOrderStats();
  const { points, today: todayKey, isLoading: seriesLoading } = useDailySales();

  const last7 = points.slice(-7);
  const today = points[points.length - 1];
  const yesterday = points[points.length - 2];
  const month = splitWindows(points, 30);
  // Las ventas, los pedidos y el ticket de los 30 días y de los 30 anteriores los calcula el back.
  const monthSummary = useSalesSummary(dayRange(todayKey, 30));
  const monthSales = monthSummary.data?.current.totalSales ?? 0;
  const monthOrders = monthSummary.data?.current.totalOrders ?? 0;
  const monthTicket = monthSummary.data?.current.averageTicket ?? 0;

  const pending = stats?.ordersSummary.pending ?? 0;
  const accepted = stats?.ordersSummary.accepted ?? 0;
  const onTheWay = stats?.ordersSummary.onTheWay ?? 0;
  const inProgress = pending + accepted + onTheWay;

  return (
    <section aria-label="Indicadores" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Ventas cobradas de hoy"
        icon={Banknote}
        value={formatCurrency(stats?.sales.today)}
        loading={statsLoading}
        aside={
          <Sparkline values={last7.map((p) => p.sales)} color={palette.primary} label="Ventas de los últimos 7 días" />
        }
        pill={seriesLoading || !today || !yesterday ? undefined : pillOf(percentChange(today.sales, yesterday.sales))}
        hint="vs. ayer"
      />
      <KpiCard
        title="Pedidos en curso"
        icon={Timer}
        value={formatNumber(inProgress)}
        loading={statsLoading}
        aside={
          <StackedBar
            label="Pedidos en curso por estado"
            segments={[
              { label: 'Sin chofer', value: pending, className: 'bg-warn' },
              { label: 'Aceptados', value: accepted, className: 'bg-info' },
              { label: 'En camino', value: onTheWay, className: 'bg-primary' },
            ]}
          />
        }
        pill={
          pending > 0
            ? { text: `${formatNumber(pending)} sin chofer`, trend: 'warn' }
            : { text: 'Todos asignados', trend: 'up' }
        }
        hint={`${formatNumber(onTheWay)} en camino`}
      />
      <KpiCard
        title="Entregados hoy"
        icon={PackageCheck}
        value={formatNumber(stats?.ordersSummary.deliveredToday)}
        loading={statsLoading}
        aside={
          <Sparkline
            values={last7.map((p) => p.orders)}
            color={palette.success}
            label="Entregas de los últimos 7 días"
          />
        }
        pill={seriesLoading || !today || !yesterday ? undefined : pillOf(percentChange(today.orders, yesterday.orders))}
        hint="vs. ayer"
      />
      <KpiCard
        title="Ventas cobradas de 30 días"
        icon={Receipt}
        value={monthSummary.isError ? '—' : compactMoney.format(monthSales)}
        loading={seriesLoading || monthSummary.isLoading}
        aside={
          <Sparkline
            values={month.current.map((p) => p.sales)}
            color={palette.accent}
            label="Ventas de los últimos 30 días"
          />
        }
        pill={
          monthSummary.isError
            ? { text: 'No se pudo cargar', trend: 'warn' }
            : monthSummary.data?.previous
              ? pillOf(percentChange(monthSales, monthSummary.data.previous.totalSales))
              : undefined
        }
        hint={
          monthSummary.isError
            ? 'reintentá en un rato'
            : monthOrders
              ? `ticket ${formatCurrency(monthTicket)}`
              : 'vs. 30 días previos'
        }
      />
    </section>
  );
};
