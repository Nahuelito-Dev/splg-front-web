import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listActiveDeliveries } from '../api/deliveries';
import type { PageParams } from '../api/httpClient';
import {
  assignOrderDelivery,
  cancelOrder,
  confirmOrderDelivery,
  getOrder,
  getOrderDeliveryCode,
  listOrderIncidents,
  listOrders,
  notifyOrderArrival,
  updateOrderStatus,
  type OrderFilters,
} from '../api/orders';
import type { CancelOrderBody, ConfirmDeliveryBody, UpdateOrderStatusBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.orders;

interface LiveOptions {
  /** Refresco periódico en ms (widgets del tablero); `false` lo desactiva (p. ej. con el socket online). */
  refetchInterval?: number | false;
  /** En false no dispara la consulta (buscadores que esperan un término mínimo). */
  enabled?: boolean;
}

export const useOrders = (
  params: PageParams,
  filters: OrderFilters = {},
  { refetchInterval, enabled = true }: LiveOptions = {},
) =>
  useQuery({
    queryKey: keys.list({ ...params, ...filters }),
    queryFn: () => listOrders(params, filters),
    placeholderData: keepPreviousData,
    refetchInterval,
    enabled,
  });

/**
 * La ficha de un pedido (GET /orders/:id). `refetchInterval` es el respaldo
 * cuando el socket de pedidos está desconectado (ver `OrderDetails`): con
 * socket online la ficha se refresca sola por evento, sin pedir de más.
 */
export const useOrder = (id: string | undefined, { refetchInterval }: LiveOptions = {}) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getOrder(id ?? ''),
    enabled: Boolean(id),
    refetchInterval,
  });

/** Incidencias reportadas para un pedido puntual (se muestran en su detalle). */
export const useOrderIncidents = (orderId: string | undefined) =>
  useQuery({
    queryKey: [...queryKeys.incidents.lists(), { order: orderId }],
    queryFn: () => listOrderIncidents(orderId ?? ''),
    enabled: Boolean(orderId),
  });

/**
 * Choferes activos para la asignación manual (modal de Pedidos). `GET
 * /delivery/active` pagina (puede haber más de 100): se pide el máximo que
 * acepta la API y se deja `search` para que la distribuidora encuentre al
 * resto por nombre, teléfono o patente.
 */
export const useActiveDeliveries = (search = '') =>
  useQuery({
    queryKey: queryKeys.deliveries.list({ active: true, search }),
    queryFn: () => listActiveDeliveries({ page: 0, pageSize: 100 }, search),
    placeholderData: keepPreviousData,
  });

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelOrderBody }) => cancelOrder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useAssignOrderDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deliveryId }: { id: string; deliveryId: string }) => assignOrderDelivery(id, deliveryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** PATCH /orders/:id/status: transiciones manuales que no requieren chofer (ver `orderStatus.ts`). */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOrderStatusBody }) => updateOrderStatus(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/**
 * GET /orders/:id/delivery-code, como mutación: es una acción bajo demanda (el
 * admin la pide para asistir una entrega), no un dato para cachear ni
 * refrescar solo con el resto de la ficha.
 */
export const useOrderDeliveryCode = () => useMutation({ mutationFn: (id: string) => getOrderDeliveryCode(id) });

/** POST /orders/:id/confirm-delivery: confirma la entrega en nombre del cliente. */
export const useConfirmOrderDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ConfirmDeliveryBody }) => confirmOrderDelivery(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** PATCH /orders/:id/arrived: no cambia el pedido, así que no invalida nada. */
export const useNotifyOrderArrival = () => useMutation({ mutationFn: (id: string) => notifyOrderArrival(id) });
