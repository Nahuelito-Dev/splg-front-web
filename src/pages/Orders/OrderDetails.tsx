import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import { useSocketContext } from '../../context/useSocketContext';
import { ORDER_SOCKET_EVENTS, type OrderSocketEventName } from '../../hooks/useSocket';
import { useOrder } from '../../services/queries/orders';
import { queryKeys } from '../../services/queries/queryKeys';
import { formatDateTime, formatShortId } from '../../utils/format';
import { labelOf, ORDER_STATUS } from '../../utils/statusLabels';
import { OrderActions } from './components/details/OrderActions';
import { OrderDeliverySupport } from './components/details/OrderDeliverySupport';
import { OrderDetailBody } from './components/details/OrderDetailBody';

/** Payload mínimo que manda `AdminGateway.notifyAdmins` con cada evento del ciclo de vida de un pedido. */
interface OrderSocketPayload {
  orderId?: string;
}

/**
 * La ficha de un pedido, con URL propia (`/orders/:id`): la tabla de Pedidos,
 * el tablero y la campana de notificaciones navegan acá en vez de abrir un
 * modal. Se refresca sola con los eventos del socket de pedidos y, si el
 * socket está desconectado, con un sondeo de respaldo.
 */
export const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline, subscribe } = useSocketContext();
  const { data: order, isPending, error, refetch } = useOrder(id, { refetchInterval: isOnline ? false : 20_000 });

  useEffect(() => {
    if (!id) return;
    const unsubscribers = (Object.values(ORDER_SOCKET_EVENTS) as OrderSocketEventName[]).map((event) =>
      subscribe<OrderSocketPayload>(event, (payload) => {
        if (payload.orderId === id) void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [id, subscribe, queryClient]);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Button variant="ghost" size="sm" icon={<ArrowLeft />} className="-ml-2 mb-3" onClick={() => navigate('/orders')}>
        Volver a pedidos
      </Button>

      {isPending ? (
        <LoadingState />
      ) : error || !order ? (
        <ErrorState error={error} resource="El pedido" onRetry={() => void refetch()} />
      ) : (
        <>
          <PageHeader
            eyebrow={`Pedido ${formatShortId(order.order_id)}`}
            title={order.customer?.full_name ?? 'Cliente sin nombre'}
            description={`Creado ${formatDateTime(order.created_at)}`}
            actions={<Badge label={labelOf(ORDER_STATUS, order.status)} />}
          />
          <div className="space-y-5">
            <OrderActions order={order} />
            <OrderDeliverySupport order={order} />
            <OrderDetailBody order={order} />
          </div>
        </>
      )}
    </div>
  );
};
