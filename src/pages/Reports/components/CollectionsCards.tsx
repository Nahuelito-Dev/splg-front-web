import { Banknote, HandCoins, TrendingDown } from 'lucide-react';
import { ErrorState, KpiCard } from '../../../common/components/ui';
import type { CifraDeCobro } from '../../../services/api/types';
import { useCollections } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';

const orders = (figure: CifraDeCobro | undefined): string | undefined =>
  figure ? `${formatNumber(figure.totalOrders)} ${figure.totalOrders === 1 ? 'pedido' : 'pedidos'}` : undefined;

/** Estado del efectivo del período: lo que el chofer todavía no confirmó, lo que quedó impago y lo dado por perdido. */
export const CollectionsCards = ({ range }: { range: DayRange }) => {
  const { data, isLoading, error, refetch } = useCollections(range);
  if (error) return <ErrorState error={error} resource="Los cobros en efectivo" onRetry={() => void refetch()} />;

  return (
    <section aria-label="Cobros en efectivo" className="space-y-2">
      <p className="text-xs text-muted">
        Cuentan los pedidos entregados en el rango. «Cobros impagos» lista todos los pendientes, sin importar cuándo se
        entregaron.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Efectivo por confirmar"
          icon={Banknote}
          value={formatCurrency(data?.pendingCash.totalAmount ?? 0)}
          loading={isLoading}
          hint={orders(data?.pendingCash)}
        />
        <KpiCard
          title="Impagos sin resolver"
          icon={HandCoins}
          value={formatCurrency(data?.unpaid.totalAmount ?? 0)}
          loading={isLoading}
          pill={data && data.unpaid.totalOrders > 0 ? { text: 'Requiere resolución', trend: 'warn' } : undefined}
          hint={orders(data?.unpaid)}
        />
        <KpiCard
          title="Pérdidas"
          icon={TrendingDown}
          value={formatCurrency(data?.writtenOff.totalAmount ?? 0)}
          loading={isLoading}
          hint={orders(data?.writtenOff)}
        />
      </div>
    </section>
  );
};
