import { PackageCheck, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import { ErrorState, KpiCard } from '../../../common/components/ui';
import { useOrders } from '../../../services/queries/orders';
import { useSalesByPayment } from '../../../services/queries/reports';
import { previousRange, type DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { variationPill } from './variation';

const ONE = { page: 0, pageSize: 1 };

/** Ventas y entregados del período (de los reportes) y todos los pedidos creados en él (del listado). */
const usePeriodTotals = (range: DayRange) => {
  const payments = useSalesByPayment(range);
  const orders = useOrders(ONE, range);
  const sales = (payments.data ?? []).reduce((acc, p) => acc + Number(p.totalSales), 0);
  const delivered = (payments.data ?? []).reduce((acc, p) => acc + Number(p.totalOrders), 0);
  return {
    loading: payments.isLoading || orders.isLoading,
    error: payments.error ?? orders.error,
    retry: () => {
      if (payments.error) void payments.refetch();
      if (orders.error) void orders.refetch();
    },
    sales,
    delivered,
    orders: orders.data?.total ?? 0,
    ticket: delivered > 0 ? sales / delivered : 0,
  };
};

export const SummaryCards = ({ range }: { range: DayRange }) => {
  const now = usePeriodTotals(range);
  const before = usePeriodTotals(previousRange(range));
  const loading = now.loading;
  if (now.error) return <ErrorState error={now.error} resource="Los totales del período" onRetry={now.retry} />;
  const compare = !before.loading && !before.error;
  const hint = compare ? 'vs. período anterior' : undefined;
  const pill = (current: number, previous: number) => (compare ? variationPill(current, previous) : undefined);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
};
