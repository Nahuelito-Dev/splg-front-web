import { UserRoundCog } from 'lucide-react';
import { Badge, Button, CardHeader, DetailList, RecordDrawer } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { Order } from '../../../services/api/types';
import { useOrder } from '../../../services/queries/orders';
import { formatCurrency, formatDateTime, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS, paymentStatusLabel, type Label } from '../../../utils/statusLabels';
import { canAssignDriver } from './orderStatus';

/** «Cobro pendiente», «Cobro cobrado»…: sin el prefijo, «Pendiente» se confunde con el estado del pedido. */
const paymentBadge = (status: NonNullable<Order['paymentStatus']>, method: Order['paymentMethodDetail']): Label => {
  const label = paymentStatusLabel(status, method);
  return { ...label, text: `Cobro ${label.text.toLowerCase()}` };
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** El pedido tal como lo trae el listado; el panel pide el detalle fresco y lo reemplaza al llegar. */
  order: Order | null;
  /** Sin él no se ofrece «Asignar chofer» (p. ej. sin distribuidora elegida). */
  onAssign?: (order: Order) => void;
}

/** Vistazo a un pedido sin salir del listado o del tablero; la gestión completa vive en `/orders/:id`. */
export const OrderQuickDrawer = ({ open, onClose, order: listed, onAssign }: Props) => {
  const { data: fresh, error, refetch } = useOrder(open ? listed?.order_id : undefined);
  const { operateHint } = usePermissions();
  const order = fresh ?? listed;
  if (!order) return null;

  const address = order.delivery_address;
  return (
    <RecordDrawer
      open={open}
      onClose={onClose}
      title={`Pedido ${formatShortId(order.order_id)}`}
      description={formatDateTime(order.created_at)}
      badges={
        <>
          <Badge label={labelOf(ORDER_STATUS, order.status)} />
          {order.deliveryMode === 'express' && <Badge label={{ text: 'Express', tone: 'accent' }} />}
          {order.paymentStatus && <Badge label={paymentBadge(order.paymentStatus, order.paymentMethodDetail)} />}
        </>
      }
      fullPageTo={`/orders/${order.order_id}`}
      error={fresh ? undefined : error}
      onRetry={() => void refetch()}
      resource="El pedido"
      footer={
        onAssign &&
        canAssignDriver(order.status) && (
          <Button
            size="sm"
            variant="secondary"
            icon={<UserRoundCog />}
            title={operateHint}
            onClick={() => onAssign(order)}
          >
            {order.delivery_id ? 'Reasignar chofer' : 'Asignar chofer'}
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <DetailList
          items={[
            { label: 'Cliente', value: order.customer?.full_name ?? 'Sin nombre' },
            { label: 'Teléfono', value: order.customer?.phone_number ?? '—' },
            {
              label: 'Entrega',
              value: address ? [address.street, address.city].filter(Boolean).join(', ') : 'Sin dirección',
              wide: true,
            },
            { label: 'Chofer', value: order.delivery_name ?? 'Sin asignar' },
            { label: 'Total', value: formatCurrency(order.total_amount), mono: true },
            ...(order.customer_notes ? [{ label: 'Nota del cliente', value: order.customer_notes, wide: true }] : []),
            ...(order.delivery_notes ? [{ label: 'Nota de entrega', value: order.delivery_notes, wide: true }] : []),
          ]}
        />

        <div>
          <CardHeader title="Ítems" as="h3" className="mb-2" />
          <ul className="divide-y divide-outline-soft rounded-xl border border-outline">
            {order.order_items.map((item, index) => (
              <li
                key={`${item.gas_cylinder?.gas_cylinder_id ?? 'item'}-${index}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate text-ink">
                  {item.quantity} × {item.gas_cylinder?.type ?? 'Producto sin datos'}
                </span>
                <span className="shrink-0 font-mono text-ink">{formatCurrency(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RecordDrawer>
  );
};
