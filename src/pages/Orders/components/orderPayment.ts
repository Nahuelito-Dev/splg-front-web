import type { Order, UnpaidCash } from '../../../services/api/types';

/** Los datos del pedido que deciden qué cobro manual admite. */
type PaymentView = Pick<Order, 'status' | 'paymentMethodDetail' | 'paymentStatus'>;

/**
 * Registrar el cobro o el impago del efectivo (`register-cash` / `register-unpaid`): el pedido tiene que estar
 * entregado, ser en efectivo y seguir con el pago pendiente. Si ya está `unpaid` se cierra con «Resolver impago».
 */
export const canRegisterCashOutcome = (order: PaymentView): boolean =>
  order.status === 'delivered' && order.paymentMethodDetail === 'cash' && order.paymentStatus === 'pending';

/** Una transferencia se confirma si el pedido no está cancelado y el pago está `pending` o `failed` (llegó tarde). */
export const canConfirmTransferReceived = (order: PaymentView): boolean =>
  order.paymentMethodDetail === 'transfer' &&
  order.status !== 'cancelled' &&
  (order.paymentStatus === 'pending' || order.paymentStatus === 'failed');

/** «No recibida» sólo vale sobre un pedido entregado con el pago `pending`: antes de entregar no frena nada. */
export const canMarkTransferNotReceived = (order: PaymentView): boolean =>
  order.paymentMethodDetail === 'transfer' && order.status === 'delivered' && order.paymentStatus === 'pending';

/** El motivo de un cobro manual tiene el mismo largo que el de una entrega manual: 10 a 500 caracteres. */
export {
  deliveryReasonCounter as paymentReasonCounter,
  deliveryReasonError as paymentReasonError,
} from './deliveryReason';

/**
 * El back contesta 200 también cuando el pago ya estaba en ese estado, sin guardar el motivo (repetir es un no-op).
 * Se detecta mirando si lo que volvió lleva el motivo enviado: el pedido en `paymentResolutionNote` (cobro en
 * efectivo y transferencia) o la incidencia que abrió el impago en su descripción.
 */
export const cashOrTransferRecorded = (order: Pick<Order, 'paymentResolutionNote'>, reason: string): boolean =>
  order.paymentResolutionNote === reason;

export const unpaidRecorded = (result: Pick<UnpaidCash, 'incident'>, reason: string): boolean =>
  Boolean(result.incident?.description?.includes(reason));
