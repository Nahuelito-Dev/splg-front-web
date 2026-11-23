import type { Order, UnpaidCash } from '../../../services/api/types';

/** Los datos del pedido que deciden qué cobro manual admite. */
type PaymentView = Pick<Order, 'status' | 'paymentMethodDetail' | 'paymentStatus'>;

/**
 * Un pedido anterior pagado por transferencia (la transferencia ya no se ofrece): sólo se lo resuelve, nunca se crea
 * uno nuevo. Sus acciones aparecen únicamente acá.
 */
export const isLegacyTransfer = (order: Pick<Order, 'paymentMethodDetail'>): boolean =>
  order.paymentMethodDetail === 'transfer';

/**
 * Registrar el cobro o el impago (`register-cash` / `register-unpaid`): el pedido tiene que estar entregado, ser en
 * efectivo (o una transferencia anterior) y seguir con el pago pendiente. Si ya está `unpaid` se cierra con «Resolver
 * impago».
 */
export const canRegisterCashOutcome = (order: PaymentView): boolean =>
  order.status === 'delivered' &&
  (order.paymentMethodDetail === 'cash' || order.paymentMethodDetail === 'transfer') &&
  order.paymentStatus === 'pending';

/** El motivo de un cobro manual tiene el mismo largo que el de una entrega manual: 10 a 500 caracteres. */
export {
  deliveryReasonCounter as paymentReasonCounter,
  deliveryReasonError as paymentReasonError,
} from './deliveryReason';

/**
 * El back contesta 200 también cuando el pago ya estaba en ese estado, sin guardar el motivo (repetir es un no-op).
 * Se detecta mirando si lo que volvió lleva el motivo enviado: el pedido en `paymentResolutionNote` (cobro en
 * efectivo) o la incidencia que abrió el impago en su descripción.
 */
export const cashRecorded = (order: Pick<Order, 'paymentResolutionNote'>, reason: string): boolean =>
  order.paymentResolutionNote === reason;

export const unpaidRecorded = (result: Pick<UnpaidCash, 'incident'>, reason: string): boolean =>
  Boolean(result.incident?.description?.includes(reason));
