import { Banknote, CalendarRange, PackageCheck, Timer } from 'lucide-react';
import { KpiCard, type KpiTrend } from '../../../common/components/ui';
import { useOrderStats, useSalesChart } from '../../../services/queries/stats';
import brand from '../../../theme/brand.json';
import { formatCurrency, formatNumber, percentChange } from '../../../utils/format';
import { Sparkline } from './Sparkline';

const trendOf = (change: number): KpiTrend => (change >= 0 ? 'up' : 'down');

/**
 * Los cuatro indicadores de arriba. Todos salen de GET /orders/stats/summary y
 * /orders/stats/chart: las ventas cuentan pedidos ENTREGADOS por su fecha de
 * entrega, y la semana es la calendario (desde el domingo).
 */
export const KpiRow = () => {
  const { data: stats, isLoading } = useOrderStats();
  const { data: chart = [] } = useSalesChart();

  const series = chart.map((point) => point.sales);
  const yesterday = series.length >= 2 ? series[series.length - 2] : undefined;
  const change = stats && yesterday !== undefined ? percentChange(stats.sales.today, yesterday) : null;

  const pending = stats?.ordersSummary.pending ?? 0;
  const inProgress = stats
    ? stats.ordersSummary.pending + stats.ordersSummary.accepted + stats.ordersSummary.onTheWay
    : 0;

  return (
    <section aria-label="Indicadores del día" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Ventas de hoy"
        icon={Banknote}
        value={formatCurrency(stats?.sales.today)}
        loading={isLoading}
        aside={<Sparkline values={series} color={brand.llama['500']} label="Ventas de los últimos 7 días" />}
        pill={
          change === null
            ? undefined
            : { text: `${change >= 0 ? '↑' : '↓'} ${formatNumber(Math.abs(change))} %`, trend: trendOf(change) }
        }
        hint="vs. ayer, en entregas"
      />
      <KpiCard
        title="Pedidos en curso"
        icon={Timer}
        value={formatNumber(inProgress)}
        loading={isLoading}
        pill={
          pending > 0
            ? { text: `${formatNumber(pending)} sin chofer`, trend: 'warn' }
            : { text: 'Todos asignados', trend: 'up' }
        }
        hint={`${formatNumber(stats?.ordersSummary.onTheWay)} en camino`}
      />
      <KpiCard
        title="Entregados hoy"
        icon={PackageCheck}
        value={formatNumber(stats?.ordersSummary.deliveredToday)}
        loading={isLoading}
        hint={`ticket promedio ${formatCurrency(stats?.performance.avgOrderValue)}`}
      />
      <KpiCard
        title="Ventas de la semana"
        icon={CalendarRange}
        value={formatCurrency(stats?.sales.week)}
        loading={isLoading}
        hint={`mes: ${formatCurrency(stats?.sales.month)}`}
      />
    </section>
  );
};
