import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, DetailSkeleton, EmptyState, ErrorState, PageHeader, PageContainer } from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { formatShortId } from '../../utils/format';
import { useCrumbLeaf } from '../../common/components';
import { useSocketContext } from '../../context/useSocketContext';
import { ORDER_SOCKET_EVENTS, type OrderSocketEventName } from '../../hooks/useSocket';
import { useOrder } from '../../services/queries/orders';
import { queryKeys } from '../../services/queries/queryKeys';
import { CylinderLinksCard } from '../PhysicalCylinders/components/CylinderLinksCard';
import { OrderCashSettlementCard } from './components/details/OrderCashSettlementCard';
import { OrderDepositCard } from './components/details/OrderDepositCard';
import { OrderDetailsToolbar } from './components/details/OrderDetailsToolbar';
import { OrderHistoryCard } from './components/details/OrderHistoryCard';
import { OrderIncidents } from './components/details/OrderIncidents';
import { OrderItemsSummary } from './components/details/OrderItemsSummary';
import { OrderSideCards } from './components/details/OrderSideCards';
import { OrderTransferReceipts } from './components/details/OrderTransferReceipts';

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
  const { needsDistributor } = usePermissions();
  const {
    data: order,
    isPending,
    error,
    refetch,
  } = useOrder(id, {
    refetchInterval: isOnline ? false : 20_000,
    enabled: !needsDistributor,
  });
  useCrumbLeaf(id ? formatShortId(id) : undefined, goBack);

  useEffect(() => {
    if (!id) return;
    const unsubscribers = (Object.values(ORDER_SOCKET_EVENTS) as OrderSocketEventName[]).map((event) =>
      subscribe<OrderSocketPayload>(event, (payload) => {
        if (payload.orderId !== id) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
        // Un pago o una confirmación pudo asentarse en una caja: la tarjeta «Cobro en caja» se vuelve a leer.
        void queryClient.invalidateQueries({ queryKey: queryKeys.cashSettings.detail(id) });
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [id, subscribe, queryClient]);

  return (
    <PageContainer>
      {needsDistributor ? (
        <>
          <PageHeader title="Pedido" />
          <Card className="p-6">
            <EmptyState
              title="Elegí una distribuidora"
              description="Como administrador general, elegí una con «Ver como» para ver el detalle de un pedido."
            />
          </Card>
        </>
      ) : isPending ? (
        <DetailSkeleton />
      ) : error || !order ? (
        <>
          <PageHeader title="Pedido" />
          <ErrorState error={error} resource="El pedido" onRetry={() => void refetch()} />
        </>
      ) : (
        <>
          <OrderDetailsToolbar order={order} />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 space-y-5 lg:col-span-2">
              {order.status === 'reserved' && <OrderDepositCard order={order} />}
              <OrderItemsSummary order={order} />
              {/* A qué caja entró lo cobrado por Mercado Pago o transferencia (o que quedó sin asentar). */}
              {(order.paymentMethodDetail === 'mercadopago' || order.paymentMethodDetail === 'transfer') && (
                <OrderCashSettlementCard orderId={order.order_id} />
              )}
              {/* Lo que subió el cliente, para confirmar la transferencia sin hacerlo a ciegas. */}
              {order.paymentMethodDetail === 'transfer' && <OrderTransferReceipts orderId={order.order_id} />}
              <OrderHistoryCard orderId={order.order_id} />
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
    </PageContainer>
  );
};
