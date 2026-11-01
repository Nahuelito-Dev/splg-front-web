import { keepPreviousData, skipToken, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { listActiveDeliveries, listDeliveries } from '../api/deliveries';
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
  getOrderPaymentState,
  getOrderStatusHistory,
  listAvailableOrders,
  listOrderIncidents,
  listOrderPaymentStates,
  listOrderTransferReceipts,
  listOrders,
  notifyOrderArrival,
  quoteOrder,
  registerCashPayment,
  releaseFraudHold,
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
  QuoteOrderBody,
  RegisterCashBody,
  ResolveUnpaidBody,
  UpdateOrderBody,
  UpdateOrderStatusBody,
} from '../api/types';
import { SKIP } from '../../utils/batch';
import { canAssignDriver, canCancel } from '../../pages/Orders/components/orderStatus';
import { BOARD_PAGE_SIZE, BOARD_STATUSES, type BoardStatus } from '../../pages/Orders/boardRules';
import { argentinaDay } from '../../utils/format';
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

/**
 * Las cuatro columnas del tablero de despacho y su `total` real. Comparten la caché de `useOrders`.
 * «Pendientes» y «Aceptados» traen los más viejos primero (los que más llevan esperando) hasta el tope de la API;
 * «En camino», los más recientes; «Entregados hoy» pide a la API sólo las entregas de hoy (día de Buenos Aires, por
 * fecha de entrega), la última entregada primero.
 */
export const boardFilters = (status: BoardStatus, today: string): OrderFilters => {
  switch (status) {
    case 'pending':
    case 'accepted':
      return { status, sort: 'createdAt', order: 'asc' };
    case 'delivered':
      return { status, deliveredFrom: today, deliveredTo: today, sort: 'deliveredAt', order: 'desc' };
    default:
      return { status };
  }
};

export const useDispatchBoard = ({ refetchInterval }: Pick<LiveOptions, 'refetchInterval'> = {}) => {
  const page: PageParams = { page: 0, pageSize: BOARD_PAGE_SIZE };
  const today = argentinaDay(new Date());
  const results = useQueries({
    queries: BOARD_STATUSES.map((status) => {
      const filters = boardFilters(status, today);
      return {
        queryKey: keys.list({ ...page, ...filters }),
        queryFn: () => listOrders(page, filters),
        placeholderData: keepPreviousData,
        refetchInterval,
      };
    }),
  });
  return Object.fromEntries(BOARD_STATUSES.map((status, index) => [status, results[index]])) as Record<
    BoardStatus,
    (typeof results)[number]
  >;
};

/** Los estados que el resumen `/orders/stats/summary` ya cuenta (pendientes, aceptados y en camino). */
const FROM_SUMMARY = ['pending', 'accepted', 'out_for_delivery'] as const;
const FROM_LIST = ORDER_FLOW.filter((status) => !(FROM_SUMMARY as readonly string[]).includes(status));

/**
 * Cuántos pedidos hay en cada estado (pestañas de Pedidos y dona del tablero).
 * Sin filtros, pendientes, aceptados y en camino salen del resumen de estadísticas (una sola llamada, la misma que
 * usa el tablero) y el resto, de una página mínima de GET /orders por estado leyendo `total`. Con búsqueda, cobro
 * o fechas el resumen no sirve (es global): cada estado se pide a GET /orders con esos mismos filtros. Un estado
 * sin dato (cargando o con error) queda en `null`, nunca en 0, y `total` es `null` si falta alguno.
 */
export const useOrderStatusCounts = (filters: Omit<OrderFilters, 'status'> = {}) => {
  const filtered = Boolean(filters.search || filters.paymentStatus || filters.from || filters.to);
  const summary = useOrderStats();
  const statuses = filtered ? ORDER_FLOW : FROM_LIST;
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: keys.list({ page: 0, pageSize: 1, status, ...(filtered ? filters : {}) }),
      queryFn: () => listOrders({ page: 0, pageSize: 1 }, { ...(filtered ? filters : {}), status }),
      staleTime: 30_000,
    })),
  });

  const fromSummary = summary.data?.ordersSummary;
  const counts = Object.fromEntries(
    ORDER_FLOW.map((status) => {
      if (!filtered && status === 'pending') return [status, fromSummary?.pending ?? null];
      if (!filtered && status === 'accepted') return [status, fromSummary?.accepted ?? null];
      if (!filtered && status === 'out_for_delivery') return [status, fromSummary?.onTheWay ?? null];
      return [status, results[statuses.indexOf(status)].data?.total ?? null];
    }),
  ) as Record<Order['status'], number | null>;
  const values = Object.values(counts);
  const total = values.some((count) => count === null) ? null : values.reduce<number>((acc, c) => acc + (c ?? 0), 0);

  return {
    counts,
    total,
    isError: (!filtered && summary.isError) || results.some((result) => result.isError),
  };
};

/**
 * La ficha de un pedido (GET /orders/:id). `refetchInterval` es el respaldo
 * cuando el socket de pedidos está desconectado (ver `OrderDetails`): con
 * socket online la ficha se refresca sola por evento, sin pedir de más.
 */
export const useOrder = (id: string | undefined, { refetchInterval, enabled = true }: LiveOptions = {}) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getOrder(id ?? ''),
    enabled: Boolean(id) && enabled,
    refetchInterval,
  });

/** Historial real de estados del pedido; cuelga de su detalle, así que se refresca cuando el pedido cambia. */
export const useOrderStatusHistory = (orderId: string | undefined) =>
  useQuery({
    queryKey: [...keys.detail(orderId ?? ''), 'status-history'],
    queryFn: () => getOrderStatusHistory(orderId ?? ''),
    enabled: Boolean(orderId),
  });

/**
 * El estado del pago de Mercado Pago de un pedido, con su historial. Cuelga del detalle, así que se refresca cuando
 * el pedido cambia (el aviso de la pasarela actualiza el pedido y el pago a la vez).
 */
export const useOrderPaymentState = (orderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: [...keys.detail(orderId ?? ''), 'payment-state'],
    queryFn: () => getOrderPaymentState(orderId ?? ''),
    enabled: Boolean(orderId) && enabled,
  });

/** Máximo de pedidos por consulta del estado del pago: el tope de la API. */
const PAYMENT_STATES_BATCH = 50;

/** El estado del pago de los pedidos de Mercado Pago de una lista, en una consulta. Sin ids no consulta. */
export const useOrderPaymentStates = (orderIds: string[]) => {
  const ids = [...new Set(orderIds)].slice(0, PAYMENT_STATES_BATCH).sort();
  return useQuery({
    queryKey: [...keys.lists(), 'payment-states', ids],
    queryFn: () => listOrderPaymentStates(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
    select: (states) => new Map(states.map((state) => [state.orderId, state])),
  });
};

/** Incidencias reportadas para un pedido puntual (se muestran en su detalle). */
export const useOrderIncidents = (orderId: string | undefined) =>
  useQuery({
    queryKey: [...queryKeys.incidents.lists(), { order: orderId }],
    queryFn: () => listOrderIncidents(orderId ?? ''),
    enabled: Boolean(orderId),
  });

/** Margen antes del vencimiento de las URL firmadas para pedirlas de nuevo, y piso para no consultar en ráfaga. */
const RECEIPT_REFRESH_MARGIN_MS = 30_000;
const RECEIPT_REFRESH_MIN_MS = 10_000;

/** Comprobantes de transferencia del pedido; las URL vencen, así que se piden de nuevo antes de que caduquen. */
export const useOrderTransferReceipts = (orderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: [...queryKeys.orders.detail(orderId ?? ''), 'transfer-receipts'],
    queryFn: () => listOrderTransferReceipts(orderId ?? ''),
    enabled: enabled && Boolean(orderId),
    staleTime: 0,
    refetchInterval: (query) => {
      const expiries = (query.state.data ?? []).map((file) => Date.parse(file.expiresAt)).filter(Number.isFinite);
      if (expiries.length === 0) return false;
      return Math.max(Math.min(...expiries) - Date.now() - RECEIPT_REFRESH_MARGIN_MS, RECEIPT_REFRESH_MIN_MS);
    },
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

/** Los choferes habilitados (estén o no en línea): de ahí salen los que se pueden asignar a mano. */
export const useEnabledDeliveries = (search = '', { distributorId, enabled = true }: ActiveDeliveriesScope = {}) =>
  useQuery({
    queryKey: queryKeys.deliveries.list({ enabled: true, search, distributorId: distributorId ?? null }),
    queryFn: () => listDeliveries({ page: 0, pageSize: 100 }, search, 'enabled', distributorId),
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
    // Una reserva programada nace en Reservas: esa lista y los cupos de las franjas quedan viejos.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots.all }),
      ]),
    // Si el alta falló por cupo (la franja se llenó mientras se cargaba), los cupos que se ven están viejos.
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots.all }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.cashBoxes.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashMovements.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashSettings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all }),
      ]),
  });
};

/** Un cobro manual cambia el pago del pedido y, según el caso, la incidencia de impago, los reportes, las ventas y la caja. */
const invalidateAfterPayment = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashBoxes.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashMovements.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashSettings.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.all }),
  ]);

/**
 * PATCH /orders/:id/payment/register-cash: el admin registra el cobro en efectivo. `scope` ata la `Idempotency-Key`
 * a la intención (pedido + cuerpo): un reintento tras un corte de red no repite el efecto.
 */
export const useRegisterCashPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: RegisterCashBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => registerCashPayment(id, body, key)),
    onSettled: () => invalidateAfterPayment(queryClient),
  });
};

/** PATCH /v2/orders/:id/payment/fraud-hold/release: libera la retención por fraude (motivo obligatorio). */
export const useReleaseFraudHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, scope }: { id: string; reason: string; scope: string }) =>
      runIntent(queryClient, scope, { id, reason }, (key) => releaseFraudHold(id, reason, key)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.all }),
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

const QUOTE_DELAY = 400;

/**
 * Cotización del back para el alta telefónica (`POST /orders/quote`). Con `null` no consulta. Espera a que el cuerpo
 * deje de cambiar antes de pedir; `stale` avisa que lo mostrado todavía es de un cuerpo anterior.
 */
export const useOrderQuote = (body: QuoteOrderBody | null) => {
  const key = JSON.stringify(body);
  const [settled, setSettled] = useState(body);
  useEffect(() => {
    const id = setTimeout(() => setSettled(body), QUOTE_DELAY);
    return () => clearTimeout(id);
    // `body` es un objeto nuevo en cada render: el contenido (`key`) es lo que decide cuándo se vuelve a cotizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const query = useQuery({
    queryKey: [...keys.all, 'quote', JSON.stringify(settled)] as const,
    queryFn: settled ? () => quoteOrder(settled) : skipToken,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 0,
  });
  return { ...query, stale: JSON.stringify(settled) !== key };
};
