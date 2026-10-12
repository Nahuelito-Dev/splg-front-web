import { http, toQuery, type PageParams } from './httpClient';
import type {
  CancelOrderBody,
  CodigoDeEntrega,
  ConfirmDeliveryBody,
  CreateOrderBody,
  Incident,
  Message,
  Order,
  PaginatedOrders,
  ResolveUnpaid,
  ResolveUnpaidBody,
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
}

/** GET /orders: pedidos de la distribuidora, paginados y filtrados en la API. */
export const listOrders = async (params: PageParams, filters: OrderFilters = {}): Promise<PaginatedOrders> => {
  const { search, status, paymentStatus, from, to } = filters;
  const { data } = await http.get<PaginatedOrders>('/orders', {
    params: {
      ...toQuery(params),
      term: search || undefined,
      status,
      paymentStatus,
      from: from || undefined,
      to: to || undefined,
    },
  });
  return data;
};

/** GET /orders/:id: la ficha completa de un pedido. */
export const getOrder = async (id: string): Promise<Order> => {
  const { data } = await http.get<Order>(`/orders/${id}`);
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
export const updateOrderStatus = async (id: string, body: UpdateOrderStatusBody): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${id}/status`, body);
  return data;
};

/**
 * GET /orders/:id/delivery-code: el código secreto de la prueba de entrega
 * con QR. Sólo existe si el pedido ya fue aceptado; sensible, se pide bajo
 * demanda (nunca se precarga con el resto de la ficha).
 */
export const getOrderDeliveryCode = async (id: string): Promise<CodigoDeEntrega> => {
  const { data } = await http.get<CodigoDeEntrega>(`/orders/${id}/delivery-code`);
  return data;
};

/** POST /orders/:id/confirm-delivery: confirma la entrega con el código leído del QR del chofer. */
export const confirmOrderDelivery = async (id: string, body: ConfirmDeliveryBody): Promise<Order> => {
  const { data } = await http.post<Order>(`/orders/${id}/confirm-delivery`, body);
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
