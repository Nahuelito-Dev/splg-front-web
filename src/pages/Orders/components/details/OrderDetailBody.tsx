import type { Order } from '../../../../services/api/types';
import { OrderDeliveryCard } from './OrderDeliveryCard';
import { OrderDepositCard } from './OrderDepositCard';
import { OrderIncidents } from './OrderIncidents';
import { OrderItemsSummary } from './OrderItemsSummary';
import { OrderTimeline } from './OrderTimeline';

/**
 * Todos los datos de un pedido: entrega, tiempos, ítems e incidencias. La usa
 * tanto la ficha con URL propia (`/orders/:id`) como el modal de historial del
 * cliente, para no duplicar la misma vista en dos lugares.
 */
export const OrderDetailBody = ({ order }: { order: Order }) => (
  <div className="space-y-5">
    <OrderDeliveryCard order={order} />
    <OrderTimeline order={order} />
    {order.status === 'reserved' && <OrderDepositCard order={order} />}
    <OrderItemsSummary order={order} />
    <OrderIncidents orderId={order.order_id} />
  </div>
);
