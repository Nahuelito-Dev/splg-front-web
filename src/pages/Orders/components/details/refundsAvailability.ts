import type { Order } from '../../../../services/api/types';

/** ¿Este pedido puede tener devoluciones por la pasarela? (pagó en línea, o es/fue express). */
export const mayHaveRefunds = (order: Pick<Order, 'paymentMethodDetail' | 'expressSurchargeAmount'>): boolean =>
  order.paymentMethodDetail === 'mercadopago' || (order.expressSurchargeAmount ?? 0) > 0;
