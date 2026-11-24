import { PackageCheck, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import { ErrorState, KpiCard, KpiGrid } from '../../../common/components/ui';
import { useOrders } from '../../../services/queries/orders';
import { useReportsSummary } from '../../../services/queries/reports';
import { previousRange, type DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { variationPill } from './variation';

const ONE = { page: 0, pageSize: 1 };

/**
 * Ventas, entregados y ticket promedio del período y del anterior, ya calculados por el back, y todos los pedidos
 * creados en cada uno (del listado).
 */
const usePeriodTotals = (range: DayRange) => {
  const summary = useReportsSummary(range);
  const orders = useOrders(ONE, range);
  const before = useOrders(ONE, previousRange(range));
  const now = summary.data?.current;
  const prev = summary.data?.previous;
  return {
    loading: summary.isLoading || orders.isLoading,
    compareLoading: summary.isLoading || before.isLoading,
    error: summary.error ?? orders.error,
    compareError: summary.error ?? before.error,
    retry: () => {
      if (summary.error) void summary.refetch();
      if (orders.error) void orders.refetch();
    },
    now: {
      sales: now?.totalSales ?? 0,
      delivered: now?.totalOrders ?? 0,
      ticket: now?.averageTicket ?? 0,
      orders: orders.data?.total ?? 0,
    },
    before: {
      sales: prev?.totalSales ?? 0,
      delivered: prev?.totalOrders ?? 0,
      ticket: prev?.averageTicket ?? 0,
      orders: before.data?.total ?? 0,
    },
  };
};

export const SummaryCards = ({ range }: { range: DayRange }) => {
  const totals = usePeriodTotals(range);
  const { now, before } = totals;
  const loading = totals.loading;
  if (totals.error)
    return <ErrorState error={totals.error} resource="Los totales del período" onRetry={totals.retry} />;
  const compare = !totals.compareLoading && !totals.compareError;
  const hint = compare ? 'vs. período anterior' : undefined;
  const pill = (current: number, previous: number) => (compare ? variationPill(current, previous) : undefined);

  return (
    <KpiGrid className="sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Ventas cobradas"
        icon={Wallet}
        value={formatCurrency(now.sales)}
        loading={loading}
        pill={pill(now.sales, before.sales)}
        hint={hint}
      />
      <KpiCard
        title="Pedidos"
        icon={ShoppingBag}
        value={formatNumber(now.orders)}
        loading={loading}
        pill={pill(now.orders, before.orders)}
        hint={hint}
      />
      <KpiCard
        title="Ticket promedio"
        icon={Receipt}
        value={formatCurrency(now.ticket)}
        loading={loading}
        pill={pill(now.ticket, before.ticket)}
        hint={hint}
      />
      <KpiCard
        title="Entregados"
        icon={PackageCheck}
        value={formatNumber(now.delivered)}
        loading={loading}
        pill={pill(now.delivered, before.delivered)}
        hint={hint}
      />
    </KpiGrid>
  );
};
