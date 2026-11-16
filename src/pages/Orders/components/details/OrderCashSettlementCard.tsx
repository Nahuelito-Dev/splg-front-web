import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { Badge, Card, CardHeader, Skeleton } from '../../../../common/components/ui';
import type { OrderCollectionEntry } from '../../../../services/api/types';
import { useOrderCashSettlement } from '../../../../services/queries/cashSettings';
import { formatCurrency, formatDateTime } from '../../../../utils/format';

const KIND_LABEL: Record<OrderCollectionEntry['kind'], string> = {
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia',
  deposit: 'Seña de la reserva',
};

/** «Ingresó a <caja>» o «Cobrado sin asentar», de cada cobro del pedido por Mercado Pago o transferencia. */
export const OrderCashSettlementCard = ({ orderId }: { orderId: string }) => {
  const { data, isPending, isError } = useOrderCashSettlement(orderId);
  // Es un dato de apoyo: si falla o no hay cobros todavía, el detalle del pedido sigue sin esta tarjeta.
  if (isError || (data && data.entries.length === 0)) return null;
  return (
    <Card className="p-4">
      <CardHeader title="Cobro en caja" icon={<Landmark />} as="h3" className="mb-3" />
      {isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <ul className="space-y-3">
          {data.entries.map((entry, index) => (
            <li
              key={entry.movementId ?? `${entry.kind}-${index}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <span className="text-sm font-medium text-ink">
                {KIND_LABEL[entry.kind]} · {formatCurrency(entry.amount)}
              </span>
              {entry.settled ? (
                <Badge label={{ text: `Ingresó a ${entry.cashBoxName ?? 'una caja'}`, tone: 'success' }} />
              ) : (
                <Badge label={{ text: 'Cobrado sin asentar', tone: 'warn' }} />
              )}
              {entry.collectedAt && <span className="text-xs text-muted">{formatDateTime(entry.collectedAt)}</span>}
              {entry.settled && entry.cashBoxId ? (
                <Link className="text-sm font-semibold text-accent underline" to={`/finance/boxes/${entry.cashBoxId}`}>
                  Ver la caja
                </Link>
              ) : (
                <Link className="text-sm font-semibold text-accent underline" to="/finance/collection-settings">
                  Configurar cajas de cobro
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
