import { Ban, Banknote, HandCoins, Landmark, Undo2, TrendingDown } from 'lucide-react';
import { ErrorState, KpiCard, KpiGrid } from '../../../common/components/ui';
import type { CifraDeCobro } from '../../../services/api/types';
import { useCollections } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';

const orders = (figure: CifraDeCobro | undefined): string | undefined =>
  figure ? `${formatNumber(figure.totalOrders)} ${figure.totalOrders === 1 ? 'pedido' : 'pedidos'}` : undefined;

/**
 * Estado de los cobros del período: el efectivo que el chofer todavía no confirmó, lo que quedó impago y lo dado por
 * perdido. De pedidos viejos pagados por transferencia, las que quedaron sin confirmar o como no recibidas (sólo se
 * muestran si hay alguna). Nada de esto suma a las ventas.
 */
export const CollectionsCards = ({ range }: { range: DayRange }) => {
  const { data, isLoading, error, refetch } = useCollections(range);
  const pendingTransfers = data?.pendingTransfer.totalOrders ?? 0;
  const notReceivedTransfers = data?.notReceivedTransfer.totalOrders ?? 0;
  if (error) return <ErrorState error={error} resource="Los cobros" onRetry={() => void refetch()} />;

  return (
    <section aria-label="Cobros del período" className="space-y-2">
      <p className="text-xs text-muted">
        Cuentan los pedidos entregados en el rango. «Cobros impagos» lista todos los pendientes, sin importar cuándo se
        entregaron. «Reintegro pendiente» no mira la entrega: cuenta los pedidos cobrados y cancelados después, según su
        última modificación dentro del rango; el sistema no gestiona la devolución, la hace la distribuidora por fuera.
      </p>
      <KpiGrid className="sm:grid-cols-2 lg:grid-cols-3">
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
        {pendingTransfers > 0 && (
          <KpiCard
            title="Transferencias sin confirmar (pedidos viejos)"
            icon={Landmark}
            value={formatCurrency(data?.pendingTransfer.totalAmount ?? 0)}
            loading={isLoading}
            hint={orders(data?.pendingTransfer)}
          />
        )}
        {notReceivedTransfers > 0 && (
          <KpiCard
            title="Transferencias no recibidas (pedidos viejos)"
            icon={Ban}
            value={formatCurrency(data?.notReceivedTransfer.totalAmount ?? 0)}
            loading={isLoading}
            hint={orders(data?.notReceivedTransfer)}
          />
        )}
        <KpiCard
          title="Reintegro pendiente"
          icon={Undo2}
          value={formatCurrency(data?.pendingRefund.totalAmount ?? 0)}
          loading={isLoading}
          pill={data && data.pendingRefund.totalOrders > 0 ? { text: 'Devolver al cliente', trend: 'warn' } : undefined}
          hint={orders(data?.pendingRefund)}
        />
      </KpiGrid>
    </section>
  );
};
