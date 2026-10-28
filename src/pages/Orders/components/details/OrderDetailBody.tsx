import type { Order } from '../../../../services/api/types';
import { OrderDepositCard } from './OrderDepositCard';
import { OrderIncidents } from './OrderIncidents';
import { OrderItemsSummary } from './OrderItemsSummary';
import { OrderPartiesCard } from './OrderPartiesCard';
import { OrderTimeline } from './OrderTimeline';
import { OrderTransferReceipts } from './OrderTransferReceipts';

/**
 * Todos los datos de un pedido: tiempos, ítems e incidencias a la izquierda;
 * cliente, entrega, chofer y pago a la derecha. La usa tanto la ficha con URL
 * propia (`/orders/:id`) como el modal de historial del cliente, para no
 * duplicar la misma vista en dos lugares.
 */
export const OrderDetailBody = ({ order }: { order: Order }) => (
  <div className="grid gap-5 lg:grid-cols-3">
    <div className="space-y-5 lg:col-span-2">
      {order.status === 'reserved' && <OrderDepositCard order={order} />}
      {order.paymentMethodDetail === 'transfer' && <OrderTransferReceipts orderId={order.order_id} />}
      <OrderTimeline order={order} />
      <OrderItemsSummary order={order} />
      <OrderIncidents orderId={order.order_id} />
    </div>
    <div className="lg:col-span-1">
      <OrderPartiesCard order={order} />
    </div>
  </div>
);
