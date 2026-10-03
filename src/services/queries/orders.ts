import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { listActiveDeliveries } from '../api/deliveries';
import type { PageParams } from '../api/httpClient';
import {
  assignOrderDelivery,
  cancelOrder,
  confirmOrderDelivery,
  createOrder,
  getOrder,
  getOrderDeliveryCode,
  listAvailableOrders,
  listOrderIncidents,
  listOrders,
  notifyOrderArrival,
  updateOrderStatus,
  type OrderFilters,
} from '../api/orders';
import type { CancelOrderBody, ConfirmDeliveryBody, CreateOrderBody, Order, UpdateOrderStatusBody } from '../api/types';
import { ORDER_FLOW } from '../../utils/statusLabels';
import { queryKeys } from './queryKeys';
import { useOrderStats } from './stats';

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

/** Los estados que el resumen `/orders/stats/summary` ya cuenta (pendientes, aceptados y en camino). */
const FROM_SUMMARY = ['pending', 'accepted', 'out_for_delivery'] as const;
const FROM_LIST = ORDER_FLOW.filter((status) => !(FROM_SUMMARY as readonly string[]).includes(status));

/**
 * Cuántos pedidos hay en cada estado (pestañas de Pedidos y dona del tablero).
 * Pendientes, aceptados y en camino salen del resumen de estadísticas (una sola
 * llamada, la misma que usa el tablero); el resto, de una página mínima de
 * GET /orders por estado leyendo `total`. Un estado sin dato (cargando o con
 * error) queda en `null`, nunca en 0, y `total` es `null` si falta alguno.
 */
export const useOrderStatusCounts = () => {
  const summary = useOrderStats();
  const results = useQueries({
    queries: FROM_LIST.map((status) => ({
      queryKey: keys.list({ page: 0, pageSize: 1, status }),
      queryFn: () => listOrders({ page: 0, pageSize: 1 }, { status }),
      staleTime: 30_000,
    })),
  });

  const fromSummary = summary.data?.ordersSummary;
  const counts = Object.fromEntries(
    ORDER_FLOW.map((status) => {
      if (status === 'pending') return [status, fromSummary?.pending ?? null];
      if (status === 'accepted') return [status, fromSummary?.accepted ?? null];
      if (status === 'out_for_delivery') return [status, fromSummary?.onTheWay ?? null];
      return [status, results[FROM_LIST.indexOf(status)].data?.total ?? null];
    }),
  ) as Record<Order['status'], number | null>;
  const values = Object.values(counts);
  const total = values.some((count) => count === null) ? null : values.reduce<number>((acc, c) => acc + (c ?? 0), 0);

  return { counts, total, isError: summary.isError || results.some((result) => result.isError) };
};

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
/** `distributorId`: la empresa del pedido, para el administrador general sin «Ver como». */
interface ActiveDeliveriesScope {
  distributorId?: string;
  enabled?: boolean;
}

export const useActiveDeliveries = (search = '', { distributorId, enabled = true }: ActiveDeliveriesScope = {}) =>
  useQuery({
    queryKey: queryKeys.deliveries.list({ active: true, search, distributorId: distributorId ?? null }),
    queryFn: () => listActiveDeliveries({ page: 0, pageSize: 100 }, search, distributorId),
    placeholderData: keepPreviousData,
    enabled,
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

/**
 * El pool de pedidos disponibles (CU-080), con refresco periódico salvo que
 * el socket esté online (igual criterio que `useOrders` del tablero): el
 * pool cambia apenas un chofer acepta uno, y el socket no avisa de esto en
 * particular.
 */
export const useAvailableOrders = (params: PageParams, search = '', { refetchInterval }: LiveOptions = {}) =>
  useQuery({
    queryKey: [...keys.lists(), 'available', { ...params, search }],
    queryFn: () => listAvailableOrders(params, search),
    placeholderData: keepPreviousData,
    refetchInterval,
  });

/** POST /orders (CU-072): alta telefónica, con los mismos efectos que el alta desde la app. */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderBody) => createOrder(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
