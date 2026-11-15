import { Link } from 'react-router-dom';
import { Badge, CardHeader, DetailList, RecordDrawer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useOrderClaims } from '../../services/queries/claims';
import { useOrder } from '../../services/queries/orders';
import { formatCurrency, formatDateTime, formatShortId } from '../../utils/format';
import { CLAIM_STATUS, labelOf, ORDER_STATUS, paidLabel, PAYMENT_METHOD } from '../../utils/statusLabels';
import { OrderHistoryCard } from '../Orders/components/details/OrderHistoryCard';
import { OrderItemsSummary } from '../Orders/components/details/OrderItemsSummary';

interface Props {
  /** El pedido de la parada tocada; `null` cierra el panel. */
  orderId: string | null;
  onClose: () => void;
}

/**
 * El pedido de una parada sin salir de la hoja: cliente y cómo llegar, garrafas y total, cómo paga y si ya pagó,
 * envases a retirar, historial de estados y reclamos. Usa la misma consulta y los mismos bloques que la ficha
 * (`/orders/:id`), adonde lleva «Ver el pedido completo».
 */
export const StopOrderDrawer = ({ orderId, onClose }: Props) =>
  orderId ? <OrderPanel orderId={orderId} onClose={onClose} /> : null;

const OrderPanel = ({ orderId, onClose }: { orderId: string; onClose: () => void }) => {
  const { needsDistributor } = usePermissions();
  const order = useOrder(orderId, { enabled: !needsDistributor });
  const claims = useOrderClaims(orderId);
  const data = order.data;
  const linked = claims.data ?? [];
  const address = data?.delivery_address;
  const empties = data?.order_items.reduce((sum, item) => sum + (item.emptiesExpected ?? 0), 0) ?? 0;

  return (
    <RecordDrawer
      open
      onClose={onClose}
      title={`Pedido ${formatShortId(orderId)}`}
      description={data ? formatDateTime(data.created_at) : undefined}
      badges={
        data && (
          <>
            <Badge label={labelOf(ORDER_STATUS, data.status)} />
            <Badge label={paidLabel(data.paymentStatus, data.paymentMethodDetail)} />
          </>
        )
      }
      fullPageTo={`/orders/${orderId}`}
      fullPageLabel="Ver el pedido completo"
      loading={order.isPending}
      error={order.error}
      onRetry={() => void order.refetch()}
      resource="El pedido"
      size="lg"
    >
      {data && (
        <div className="space-y-5">
          <DetailList
            items={[
              { label: 'Cliente', value: data.customer?.full_name ?? 'Sin nombre' },
              { label: 'Teléfono', value: data.customer?.phone_number ?? '—' },
              {
                label: 'Dirección',
                value: address ? [address.street, address.city].filter(Boolean).join(', ') : 'Sin dirección',
                wide: true,
              },
              ...(address?.additional_instructions
                ? [{ label: 'Indicaciones', value: address.additional_instructions, wide: true }]
                : []),
              ...(data.customer_notes ? [{ label: 'Nota del cliente', value: data.customer_notes, wide: true }] : []),
              ...(data.delivery_notes ? [{ label: 'Nota de entrega', value: data.delivery_notes, wide: true }] : []),
              { label: 'Total', value: <span className="tabular-nums">{formatCurrency(data.total_amount)}</span> },
              { label: 'Pago', value: labelOf(PAYMENT_METHOD, data.paymentMethodDetail).text },
              {
                label: 'Envases a retirar',
                value: <span className="tabular-nums">{empties > 0 ? String(empties) : 'Ninguno'}</span>,
              },
            ]}
          />
          <OrderItemsSummary order={data} />
          <OrderHistoryCard orderId={data.order_id} />
          <section aria-label="Reclamos del pedido">
            <CardHeader title="Reclamos" as="h3" className="mb-2" />
            {claims.isError ? (
              <p role="alert" className="text-sm text-danger">
                No se pudieron cargar los reclamos.
              </p>
            ) : claims.isPending ? (
              <p className="text-sm text-muted">Cargando reclamos…</p>
            ) : linked.length === 0 ? (
              <p className="text-sm text-muted">Sin reclamos.</p>
            ) : (
              <ul className="divide-y divide-outline-soft rounded-xl border border-outline">
                {linked.map((claim) => (
                  <li key={claim.claim_id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <Link
                      to={`/claims?claim=${claim.claim_id}`}
                      className="min-w-0 text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <b className="block truncate font-semibold">{claim.reason}</b>
                      <span className="block text-xs text-muted">{formatDateTime(claim.createdAt)}</span>
                    </Link>
                    <Badge label={labelOf(CLAIM_STATUS, claim.status)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </RecordDrawer>
  );
};
