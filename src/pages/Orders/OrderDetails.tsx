import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DetailSkeleton, ErrorState, PageHeader } from '../../common/components/ui';
import { useBackToList } from '../../hooks';
import { useSocketContext } from '../../context/useSocketContext';
import { ORDER_SOCKET_EVENTS, type OrderSocketEventName } from '../../hooks/useSocket';
import { useOrder } from '../../services/queries/orders';
import { queryKeys } from '../../services/queries/queryKeys';
import { CylinderLinksCard } from '../PhysicalCylinders/components/CylinderLinksCard';
import { OrderDepositCard } from './components/details/OrderDepositCard';
import { OrderDetailsToolbar } from './components/details/OrderDetailsToolbar';
import { OrderHistoryCard } from './components/details/OrderHistoryCard';
import { OrderIncidents } from './components/details/OrderIncidents';
import { OrderItemsSummary } from './components/details/OrderItemsSummary';
import { OrderSideCards } from './components/details/OrderSideCards';

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
  const goBack = useBackToList('/orders');
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
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {isPending ? (
        <DetailSkeleton />
      ) : error || !order ? (
        <>
          <PageHeader
            title="Pedido"
            breadcrumbs={[{ label: 'Pedidos', to: '/orders', onClick: goBack }, { label: 'No disponible' }]}
          />
          <ErrorState error={error} resource="El pedido" onRetry={() => void refetch()} />
        </>
      ) : (
        <>
          <OrderDetailsToolbar order={order} />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 space-y-5 lg:col-span-2">
              {order.status === 'reserved' && <OrderDepositCard order={order} />}
              <OrderItemsSummary order={order} />
              <OrderHistoryCard order={order} />
              <CylinderLinksCard
                title="Envases"
                filters={{ orderId: order.order_id }}
                emptyTitle="Sin envases en este pedido"
                emptyDescription="No hay series de envases asignadas a este pedido (la distribuidora puede no usar envases serializados)."
                listSearch={`order=${order.order_id}`}
              />
              <OrderIncidents orderId={order.order_id} />
            </div>
            <div className="min-w-0 lg:col-span-1">
              <OrderSideCards order={order} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
