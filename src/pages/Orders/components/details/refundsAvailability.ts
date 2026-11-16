import type { Order, Refund } from '../../../../services/api/types';

/** ¿Este pedido puede tener devoluciones por la pasarela? (pagó en línea, o es/fue express). */
export const mayHaveRefunds = (order: Pick<Order, 'paymentMethodDetail' | 'expressSurchargeAmount'>): boolean =>
  order.paymentMethodDetail === 'mercadopago' || (order.expressSurchargeAmount ?? 0) > 0;

/** Una solicitud `pending` más vieja que esto quedó a medias (el back también la retoma solo). */
export const STALE_PENDING_MS = 5 * 60 * 1000;

type OrderForRetry = Pick<
  Order,
  'paymentMethodDetail' | 'paymentStatus' | 'status' | 'expressSurchargeAmount' | 'expressDegradedAt'
>;

/**
 * ¿Se ofrece «Reintentar devolución»? Si alguna falló o quedó pendiente hace rato, o si el pedido tiene una
 * devolución que nunca se pidió: cancelado y cobrado por MercadoPago, o un express que pasó al reparto común con el
 * recargo cobrado. Aunque no haya ninguna fila.
 */
export const canRetryRefunds = (
  order: OrderForRetry,
  refunds: Pick<Refund, 'kind' | 'status' | 'updatedAt'>[],
  now: number = Date.now(),
): boolean => {
  if (refunds.some((refund) => refund.status === 'failed')) return true;
  if (refunds.some((refund) => refund.status === 'pending' && now - Date.parse(refund.updatedAt) > STALE_PENDING_MS)) {
    return true;
  }
  if (order.paymentMethodDetail !== 'mercadopago') return false;
  const done = (kind: Refund['kind']) =>
    refunds.some((refund) => refund.kind === kind && refund.status === 'succeeded');
  if (order.status === 'cancelled' && order.paymentStatus === 'paid') return !done('full');
  return (
    Boolean(order.expressDegradedAt) && order.expressSurchargeAmount > 0 && !done('express_surcharge') && !done('full')
  );
};
