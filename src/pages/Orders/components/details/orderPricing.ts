import type { Order } from '../../../../services/api/types';

/**
 * Recargo por pago online: no viene explícito en la respuesta, pero se puede
 * despejar del total. El back aplica +10% sobre (subtotal + recargo de zona)
 * para MercadoPago y transferencia, 0% en efectivo
 * (`order-pricing.service.ts`, `applyPaymentSurcharge`): se calcula acá en vez
 * de duplicar esa regla, para no desalinearse si cambia el porcentaje.
 */
export const onlinePaymentSurcharge = (
  order: Pick<Order, 'total_amount' | 'subtotal_items' | 'zone_surcharge'>,
): number => {
  const zoneAmount = order.zone_surcharge?.amount ?? 0;
  const surcharge = order.total_amount - order.subtotal_items - zoneAmount;
  return surcharge > 0 ? surcharge : 0;
};
