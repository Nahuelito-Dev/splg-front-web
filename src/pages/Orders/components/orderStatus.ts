import type { Order } from '../../../services/api/types';

type OrderStatus = Order['status'];

/** Un pedido entregado o cancelado ya terminó su recorrido: no se asigna ni se cancela de nuevo. */
export const isClosed = (status: OrderStatus): boolean => status === 'delivered' || status === 'cancelled';

/** El recibo (GET /v2/orders/:id/recibo.pdf) sólo existe con el pedido cobrado y no cancelado: si no, el back da 409. */
export const canIssueReceipt = (order: { status: OrderStatus; paymentStatus?: string | null }): boolean =>
  order.paymentStatus === 'paid' && order.status !== 'cancelled';

/** Cancelar (PATCH /orders/:id/cancel) es válido en cualquier estado no terminal. */
export const canCancel = (status: OrderStatus): boolean => !isClosed(status);

/**
 * Asignar o reasignar chofer (PATCH /orders/:id/assign/:deliveryId) mueve el
 * pedido a ACCEPTED. La máquina de estados del back (`order-status.machine.ts`)
 * sólo permite esa transición desde PENDING, o repetirla desde ACCEPTED (para
 * reasignar): probado contra la API, intentarlo en cualquier otro estado
 * responde 400 "Transición de pedido inválida".
 */
export const canAssignDriver = (status: OrderStatus): boolean => status === 'pending' || status === 'accepted';

export const ASSIGN_UNPAID_MP_HINT =
  'Se paga con Mercado Pago y todavía no está pago: el chofer se asigna cuando se apruebe el pago';

/**
 * Un pedido de Mercado Pago no sale hasta que el pago esté aprobado (`esperaPagoOnline` del back: no se ofrece, no
 * figura entre los disponibles y asignarlo da 409). La reserva con la seña paga sí sale: el saldo se cobra al entregar.
 * Devuelve el motivo para mostrarlo, o nada si se puede asignar.
 */
export const assignPaymentBlock = (order: {
  paymentMethodDetail?: string | null;
  paymentStatus?: string | null;
  depositPaid?: boolean | null;
}): string | undefined =>
  order.paymentMethodDetail === 'mercadopago' && order.paymentStatus !== 'paid' && !order.depositPaid
    ? ASSIGN_UNPAID_MP_HINT
    : undefined;

/**
 * Transiciones manuales que ofrece la ficha para `PATCH /orders/:id/status`,
 * en el vocabulario de la RESPUESTA de la API (`out_for_delivery`). Salen de
 * `ORDER_TRANSITIONS` del dominio del back, con dos recortes a propósito:
 *
 * - Nunca `accepted`: esa transición exige un chofer y la resuelve la acción
 *   dedicada "Asignar chofer".
 * - Nunca `cancelled`: probado contra la API, cancelar por acá NO restituye el
 *   stock de las garrafas (a diferencia de `PATCH /orders/:id/cancel`, que sí
 *   lo hace) — dejarlo acá vendería garrafas para siempre. La acción dedicada
 *   "Cancelar pedido" es la única cancelación que se ofrece en la ficha.
 */
const MANUAL_STATUS_TARGETS: Record<OrderStatus, OrderStatus[]> = {
  reserved: ['pending'],
  pending: [],
  accepted: ['out_for_delivery', 'pending'],
  out_for_delivery: ['delivered', 'pending'],
  delivered: [],
  cancelled: [],
};

export const manualStatusTargets = (status: OrderStatus): OrderStatus[] => MANUAL_STATUS_TARGETS[status];

/** El texto del botón que dispara cada transición manual hacia `to`. */
const MANUAL_STATUS_LABEL: Record<OrderStatus, string> = {
  reserved: 'Volver a reservado',
  pending: 'Volver a pendiente',
  accepted: 'Marcar aceptado',
  out_for_delivery: 'Marcar en camino',
  delivered: 'Marcar como entregado',
  cancelled: 'Cancelar',
};

/**
 * El texto de cada transición manual depende también de DÓNDE está el
 * pedido: "pending" es el único destino que sale de dos lugares distintos
 * (`reserved` y `accepted`/`out_for_delivery`) y significa cosas distintas en
 * cada uno — activar una reserva no es lo mismo que liberar un pedido ya
 * despachado.
 */
export const manualStatusActionLabel = (from: OrderStatus, to: OrderStatus): string =>
  from === 'reserved' && to === 'pending' ? 'Activar reserva' : MANUAL_STATUS_LABEL[to];

/**
 * El código de entrega (QR anti-fraude) existe desde que el pedido fue
 * aceptado y hasta que se cierra: lo genera tanto la aceptación del chofer
 * como la asignación manual desde el panel (al reasignar se genera uno nuevo).
 */
export const canViewDeliveryCode = (status: OrderStatus): boolean =>
  status === 'accepted' || status === 'out_for_delivery';

/** Confirmar la entrega y avisar la llegada sólo tienen sentido con el pedido en camino. */
export const canConfirmDelivery = (status: OrderStatus): boolean => status === 'out_for_delivery';
export const canNotifyArrival = (status: OrderStatus): boolean => status === 'out_for_delivery';
