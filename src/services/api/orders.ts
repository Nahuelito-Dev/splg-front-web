import { env } from '../../config/env';
import { http, toQuery, type PageParams } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type {
  CancelOrderBody,
  CodigoDeEntrega,
  ConfirmDeliveryV3Body,
  CreateOrderBody,
  CustomerPurchaseStats,
  DeliveryOptions,
  Incident,
  Message,
  MotivoDeCobroBody,
  Order,
  OrderPaymentState,
  OrderStatusHistoryEntry,
  PaginatedOrders,
  Quote,
  QuoteOrderBody,
  ResolveUnpaid,
  RegisterCashBody,
  ResolveUnpaidBody,
  UnpaidCash,
  UpdateOrderBody,
  UpdateOrderStatusBody,
} from './types';

/** Filtros de GET /orders. Fechas en YYYY-MM-DD; `to` es inclusivo. */
export interface OrderFilters {
  /** Nombre, email o teléfono del cliente, o parte del id del pedido. */
  search?: string;
  status?: Order['status'];
  paymentStatus?: NonNullable<Order['paymentStatus']>;
  from?: string;
  to?: string;
  /** Entregados desde/hasta (YYYY-MM-DD, `deliveredTo` inclusivo): filtra por fecha de entrega, no de alta. */
  deliveredFrom?: string;
  deliveredTo?: string;
  /** Campo de orden (por defecto, la fecha de alta) y sentido (por defecto, los más nuevos primero). */
  sort?: 'createdAt' | 'deliveredAt';
  order?: 'asc' | 'desc';
}

/** Los parámetros de GET /orders sin paginar: los mismos que usa el exporte completo. */
export const orderQuery = (filters: OrderFilters = {}) => {
  const { search, status, paymentStatus, from, to, deliveredFrom, deliveredTo, sort, order } = filters;
  return {
    term: search || undefined,
    status,
    paymentStatus,
    from: from || undefined,
    to: to || undefined,
    deliveredFrom: deliveredFrom || undefined,
    deliveredTo: deliveredTo || undefined,
    sort,
    order,
  };
};

/** GET /orders: pedidos de la distribuidora, paginados y filtrados en la API. */
export const listOrders = async (params: PageParams, filters: OrderFilters = {}): Promise<PaginatedOrders> => {
  const { data } = await http.get<PaginatedOrders>('/orders', {
    params: { ...toQuery(params), ...orderQuery(filters) },
  });
  return data;
};

/** GET /orders/:id: la ficha completa de un pedido. */
export const getOrder = async (id: string): Promise<Order> => {
  const { data } = await http.get<Order>(`/orders/${id}`);
  return data;
};

/** Base de la v2 de la API (el estado del pago de Mercado Pago sólo existe ahí). */
const v2 = { baseURL: env.apiUrlV2 };

/**
 * GET /v2/orders/:id/payment: el estado del pago de Mercado Pago del pedido (uno de los nueve de la pasarela), su
 * motivo, el texto en castellano que arma el back, si se puede reintentar y el historial de cambios.
 */
export const getOrderPaymentState = async (id: string): Promise<OrderPaymentState> => {
  const { data } = await http.get<OrderPaymentState>(`/orders/${id}/payment`, v2);
  return data;
};

/**
 * PATCH /v2/orders/:id/payment/fraud-hold/release: el administrador libera un pedido retenido por una alerta de
 * fraude de Mercado Pago, con un motivo obligatorio (queda auditado). Con `Idempotency-Key`.
 */
export const releaseFraudHold = async (id: string, reason: string, key: string): Promise<void> => {
  await http.patch(`/orders/${id}/payment/fraud-hold/release`, { reason }, { ...v2, headers: idempotencyHeaders(key) });
};

/** GET /v2/orders/payments?ids=…: el estado del pago de varios pedidos (la lista), hasta 50 por consulta. */
export const listOrderPaymentStates = async (ids: string[]): Promise<OrderPaymentState[]> => {
  const { data } = await http.get<OrderPaymentState[]>('/orders/payments', { ...v2, params: { ids: ids.join(',') } });
  return data;
};

/**
 * GET /orders/:id/status-history: las transiciones y anotaciones reales del pedido, de la más vieja a la más nueva.
 */
export const getOrderStatusHistory = async (id: string): Promise<OrderStatusHistoryEntry[]> => {
  const { data } = await http.get<OrderStatusHistoryEntry[]>(`/orders/${id}/status-history`);
  return data;
};

/**
 * PATCH /orders/:id: edita un pedido pendiente (dirección, franja, fecha, pago, notas, renglones). Si llegan `items`
 * reemplazan a todos los actuales: el back devuelve el stock viejo, reserva el nuevo y recalcula el total con los
 * precios vigentes. 409 si el pedido no está pendiente, ya tiene chofer o se pagó online; 400 sin stock, fuera de
 * cobertura o al pasar a MercadoPago.
 */
export const updateOrder = async (id: string, body: UpdateOrderBody): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${id}`, body);
  return data;
};

/**
 * PATCH /orders/:id/cancel: cancela el pedido (o lo libera a pendiente si lo
 * pide un chofer). El actor sale del token; acá sólo viaja el motivo,
 * opcional. Restituye stock. Idempotente vía `Idempotency-Key`.
 */
export const cancelOrder = async (id: string, body: CancelOrderBody): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${id}/cancel`, body);
  return data;
};

/** PATCH /orders/:id/assign/:deliveryId: asignación manual, pisa la automática. */
export const assignOrderDelivery = async (id: string, deliveryId: string): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${id}/assign/${deliveryId}`);
  return data;
};

/**
 * PATCH /orders/:id/status: mueve el pedido a otro estado de la máquina del
 * back (`on_the_way`, no `out_for_delivery`: ver `orderStatus.ts`). El panel
 * sólo la usa para las transiciones que no necesitan asignar chofer ni
 * restituir stock (eso lo hacen `assignOrderDelivery` y `cancelOrder`).
 */
export const updateOrderStatus = async (
  id: string,
  body: UpdateOrderStatusBody,
  idempotencyKey?: string,
): Promise<Order> => {
  const { data } = await http.patch<Order>(
    `/orders/${id}/status`,
    body,
    idempotencyKey ? { headers: idempotencyHeaders(idempotencyKey) } : undefined,
  );
  return data;
};

const V3 = { baseURL: env.apiUrlV3 };

/**
 * GET /v3/orders/:id/delivery-code: el código de 6 dígitos que ve el cliente y tipea el chofer. Sólo existe con el
 * pedido aceptado o en camino; sensible, se pide bajo demanda (nunca se precarga con el resto de la ficha).
 */
export const getOrderDeliveryCode = async (id: string): Promise<CodigoDeEntrega> => {
  const { data } = await http.get<CodigoDeEntrega>(`/orders/${id}/delivery-code`, V3);
  return data;
};

/** POST /v3/orders/:id/delivery-code/regenerate: un código nuevo (los intentos vuelven a 0). Sólo con el pedido en camino. */
export const regenerateOrderDeliveryCode = async (id: string): Promise<CodigoDeEntrega> => {
  const { data } = await http.post<CodigoDeEntrega>(`/orders/${id}/delivery-code/regenerate`, undefined, V3);
  return data;
};

/** POST /v3/orders/:id/confirm-delivery: el admin confirma la entrega sin el chofer, con motivo. */
export const confirmOrderDelivery = async (
  id: string,
  body: ConfirmDeliveryV3Body,
  idempotencyKey: string,
): Promise<Order> => {
  const { data } = await http.post<Order>(`/orders/${id}/confirm-delivery`, body, {
    ...V3,
    headers: idempotencyHeaders(idempotencyKey),
  });
  return data;
};

/** PATCH /orders/:id/arrived: avisa al cliente que el chofer llegó. No cambia el estado del pedido. */
export const notifyOrderArrival = async (id: string): Promise<Message> => {
  const { data } = await http.patch<Message>(`/orders/${id}/arrived`);
  return data;
};

/** GET /incidents/order/:orderId: incidencias reportadas para un pedido puntual. */
export const listOrderIncidents = async (orderId: string): Promise<Incident[]> => {
  const { data } = await http.get<Incident[]>(`/incidents/order/${orderId}`);
  return data;
};

/** GET /orders/customer/:userId — el historial de un cliente (por su user_id). Lo usa Clientes. */
export const listCustomerOrders = async (userId: string, params: PageParams): Promise<PaginatedOrders> => {
  const { data } = await http.get<PaginatedOrders>(`/orders/customer/${userId}`, { params: toQuery(params) });
  return data;
};

/**
 * GET /v2/orders/customer/:userId/stats: lo que el cliente le compró a la distribuidora (total comprado, pedidos,
 * ticket promedio, última entrega), calculado por el back sobre todos sus pedidos.
 */
export const getCustomerPurchaseStats = async (userId: string): Promise<CustomerPurchaseStats> => {
  const { data } = await http.get<CustomerPurchaseStats>(`/orders/customer/${userId}/stats`, { baseURL: env.apiUrlV2 });
  return data;
};

/**
 * GET /orders/available (CU-080): el pool de pedidos `pending` sin chofer
 * asignado, acotado a la distribuidora activa. Es lo mismo que ve la app del
 * chofer; el panel lo muestra en Seguimiento para poder asignar a mano.
 */
export const listAvailableOrders = async (params: PageParams, search = ''): Promise<PaginatedOrders> => {
  const { data } = await http.get<PaginatedOrders>('/orders/available', {
    params: { ...toQuery(params), term: search || undefined },
  });
  return data;
};

/**
 * POST /orders (CU-072): alta telefónica. El panel la usa cuando el cliente
 * llama en vez de pedir desde la app; el actor sigue siendo el `customerId`
 * (su `user_id`), no el admin que lo tipea.
 */
export const createOrder = async (body: CreateOrderBody): Promise<Order> => {
  const { data } = await http.post<Order>('/orders', body);
  return data;
};

/**
 * POST /orders/quote: el desglose que cobrará el alta con el mismo cuerpo (renglones con promoción por volumen,
 * subtotal, recargos de zona, medio de pago y express, y total). No escribe nada ni reserva stock; rechaza lo que el
 * alta rechazaría (sin stock, fuera de cobertura).
 */
export const quoteOrder = async (body: QuoteOrderBody): Promise<Quote> => {
  const { data } = await http.post<Quote>('/orders/quote', body);
  return data;
};

/** GET /orders/delivery/:deliveryId — el historial de pedidos de un chofer (CU-081). Lo usa Choferes. */
export const listDeliveryOrders = async (deliveryId: string, params: PageParams): Promise<PaginatedOrders> => {
  const { data } = await http.get<PaginatedOrders>(`/orders/delivery/${deliveryId}`, { params: toQuery(params) });
  return data;
};

/**
 * PATCH /orders/:id/payment/resolve-unpaid: el admin cierra un cobro en efectivo informado como impago, ya sea porque
 * se cobró después (`paid`) o porque se da por perdido (`written_off`). La nota es obligatoria. El back cierra la incidencia `unpaid_collection` en la misma transacción; `alreadyResolved` avisa que otro administrador ya había hecho la misma resolución. 409 si el pedido no
 * está impago (por ejemplo, ya lo resolvió otro admin). Con la misma `Idempotency-Key` un reintento no repite el efecto.
 */
export const resolveUnpaidOrder = async (
  id: string,
  body: ResolveUnpaidBody,
  idempotencyKey: string,
): Promise<ResolveUnpaid> => {
  const { data } = await http.patch<ResolveUnpaid>(`/orders/${id}/payment/resolve-unpaid`, body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
};

/**
 * PATCH /orders/:id/payment/register-cash: el admin registra que cobró el efectivo de un pedido entregado cuyo chofer
 * no lo confirmó. `reason` (10 a 500 caracteres) queda en el pedido, en el historial y en la auditoría. `cashBoxId` es la caja
 * donde entra el efectivo (obligatoria si la distribuidora tiene cajas activas). 400 si el
 * pedido no está entregado o no es en efectivo; 409 si el pago ya se informó como impago. Repetirlo es un no-op.
 */
export const registerCashPayment = async (
  id: string,
  body: RegisterCashBody,
  idempotencyKey: string,
): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${id}/payment/register-cash`, body, {
    headers: idempotencyHeaders(idempotencyKey),
  });
  return data;
};

/**
 * PATCH /orders/:id/payment/register-unpaid: el admin informa el impago de un pedido entregado en efectivo cuando el
 * chofer no lo hizo. Pasa el pago a `unpaid` y abre UNA incidencia `unpaid_collection`; se cierra con `resolve-unpaid`.
 */
export const registerUnpaidPayment = async (
  id: string,
  body: MotivoDeCobroBody,
  idempotencyKey: string,
): Promise<UnpaidCash> => {
  const { data } = await http.patch<UnpaidCash>(`/orders/${id}/payment/register-unpaid`, body, {
    headers: idempotencyHeaders(idempotencyKey),
  });
  return data;
};

/**
 * GET /orders/delivery-options: modalidades de entrega para una dirección (CU-148). La programada siempre figura;
 * la express sólo con cobertura, horario y una moto cerca. No escribe nada: el alta vuelve a evaluar.
 */
export const getDeliveryOptions = async (addressId: string, customerId: string): Promise<DeliveryOptions> => {
  const { data } = await http.get<DeliveryOptions>('/orders/delivery-options', { params: { addressId, customerId } });
  return data;
};
