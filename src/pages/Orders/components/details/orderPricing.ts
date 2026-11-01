import type { Order, Quote } from '../../../../services/api/types';

/** Recargo por medio de pago en pesos, tal cual lo guardó el back: el panel no lo calcula ni lo deduce del total. */
export const paymentSurchargeAmount = (order: Pick<Order, 'paymentSurchargeAmount'>): number =>
  order.paymentSurchargeAmount ?? 0;

const MEDIO: Record<string, string> = {
  transfer: 'transferencia',
  mercadopago: 'Mercado Pago',
  cash: 'efectivo',
};

const formatPercentage = (value: number): string =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);

/**
 * Cómo se nombra el recargo: por el medio de pago y con el porcentaje con que lo calculó el back
 * («Recargo por transferencia (10 %)»). Sin porcentaje (pedidos anteriores a que fuera configurable) va sin él.
 */
export const paymentSurchargeLabel = (
  method: string | null | undefined,
  percentage: number | null | undefined,
): string => {
  const medio = method ? MEDIO[method] : undefined;
  const base = medio ? `Recargo por ${medio}` : 'Recargo por medio de pago';
  return typeof percentage === 'number' ? `${base} (${formatPercentage(percentage)} %)` : base;
};

export const orderSurchargeLabel = (order: Pick<Order, 'paymentMethodDetail' | 'paymentSurchargePercentage'>): string =>
  paymentSurchargeLabel(order.paymentMethodDetail, order.paymentSurchargePercentage);

export const quoteSurchargeLabel = (quote: Pick<Quote, 'paymentMethod' | 'paymentSurchargePercentage'>): string =>
  paymentSurchargeLabel(quote.paymentMethod, quote.paymentSurchargePercentage);
