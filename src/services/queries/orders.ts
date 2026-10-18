import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { listActiveDeliveries } from '../api/deliveries';
import type { PageParams } from '../api/httpClient';
import {
  assignOrderDelivery,
  cancelOrder,
  confirmOrderDelivery,
  confirmTransfer,
  createOrder,
  getDeliveryOptions,
  getOrder,
  getOrderDeliveryCode,
  getOrderStatusHistory,
  listAvailableOrders,
  listOrderIncidents,
  listOrders,
  notifyOrderArrival,
  registerCashPayment,
  registerUnpaidPayment,
  resolveUnpaidOrder,
  updateOrder,
  updateOrderStatus,
  type OrderFilters,
} from '../api/orders';
import type {
  CancelOrderBody,
  ConfirmDeliveryBody,
  ConfirmTransferBody,
  CreateOrderBody,
  MotivoDeCobroBody,
  Order,
  ResolveUnpaidBody,
  UpdateOrderBody,
  UpdateOrderStatusBody,
} from '../api/types';
import { SKIP } from '../../utils/batch';
import { canAssignDriver, canCancel } from '../../pages/Orders/components/orderStatus';
import { ORDER_FLOW } from '../../utils/statusLabels';
import { useBatchMutation } from './batchMutation';
import { runIntent } from './intent';
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

/** Historial real de estados del pedido; cuelga de su detalle, así que se refresca cuando el pedido cambia. */
export const useOrderStatusHistory = (orderId: string | undefined) =>
  useQuery({
    queryKey: [...keys.detail(orderId ?? ''), 'status-history'],
    queryFn: () => getOrderStatusHistory(orderId ?? ''),
    enabled: Boolean(orderId),
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
    mutationFn: ({ id, body, scope }: { id: string; body: UpdateOrderStatusBody; scope?: string }) =>
      scope
        ? runIntent(queryClient, scope, { id, body }, (key) => updateOrderStatus(id, body, key))
        : updateOrderStatus(id, body),
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
    mutationFn: ({ id, body, scope }: { id: string; body: ConfirmDeliveryBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => confirmOrderDelivery(id, body, key)),
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

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOrderBody }) => updateOrder(id, body),
    // Cambiar renglones devuelve y reserva stock y recalcula el total: el catálogo y las estadísticas quedan viejos.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gasCylinders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
      ]),
  });
};

/**
 * Acciones en lote sobre pedidos: una llamada por pedido, de a una. Antes de cada una se vuelve a pedir el pedido
 * (el estado de la tabla puede estar viejo): si ya no admite la acción se omite en vez de contarlo como falla.
 */
export const useBulkAssignOrders = () =>
  useBatchMutation<{ ids: string[]; deliveryId: string }>({
    run: async ({ deliveryId }, id) => {
      if (!canAssignDriver((await getOrder(id)).status)) return SKIP;
      return assignOrderDelivery(id, deliveryId);
    },
    invalidate: keys.all,
    noun: ['pedido', 'pedidos'],
    participle: ['asignado', 'asignados'],
  });

export const useBulkCancelOrders = () =>
  useBatchMutation<{ ids: string[]; body: CancelOrderBody }>({
    run: async ({ body }, id) => {
      if (!canCancel((await getOrder(id)).status)) return SKIP;
      return cancelOrder(id, body);
    },
    invalidate: keys.all,
    noun: ['pedido', 'pedidos'],
    participle: ['cancelado', 'cancelados'],
  });

/**
 * Resuelve un cobro impago en una sola llamada: el back cierra además la incidencia `unpaid_collection` en la misma
 * transacción. La respuesta trae `alreadyResolved` si otro administrador ya había hecho la misma resolución.
 */
export const useResolveUnpaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, idempotencyKey }: { id: string; body: ResolveUnpaidBody; idempotencyKey: string }) =>
      resolveUnpaidOrder(id, body, idempotencyKey),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
      ]),
  });
};

/** Un cobro manual cambia el pago del pedido y, según el caso, la incidencia de impago, los reportes y las ventas. */
const invalidateAfterPayment = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
  ]);

/**
 * PATCH /orders/:id/payment/register-cash: el admin registra el cobro en efectivo. `scope` ata la `Idempotency-Key`
 * a la intención (pedido + cuerpo): un reintento tras un corte de red no repite el efecto.
 */
export const useRegisterCashPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: MotivoDeCobroBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => registerCashPayment(id, body, key)),
    onSettled: () => invalidateAfterPayment(queryClient),
  });
};

/** PATCH /orders/:id/payment/register-unpaid: el admin informa el impago; abre la incidencia `unpaid_collection`. */
export const useRegisterUnpaidPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: MotivoDeCobroBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => registerUnpaidPayment(id, body, key)),
    onSettled: () => invalidateAfterPayment(queryClient),
  });
};

/** PATCH /orders/:id/payment/confirm-transfer: confirma o marca como no recibida la transferencia. */
export const useConfirmTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: ConfirmTransferBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => confirmTransfer(id, body, key)),
    onSettled: () => invalidateAfterPayment(queryClient),
  });
};

/** Modalidades de entrega de una dirección (CU-148). Sólo se consulta con cliente y dirección elegidos. */
export const useDeliveryOptions = (addressId: string | undefined, customerId: string | undefined) =>
  useQuery({
    queryKey: [...keys.all, 'delivery-options', addressId ?? '', customerId ?? ''] as const,
    queryFn: () => getDeliveryOptions(addressId ?? '', customerId ?? ''),
    enabled: Boolean(addressId && customerId),
  });
