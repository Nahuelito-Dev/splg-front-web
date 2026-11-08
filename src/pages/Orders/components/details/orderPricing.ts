import { toApiError } from '../../../../services/api/errors';
import type { Order, Quote, QuoteItem } from '../../../../services/api/types';
import { formatCurrency } from '../../../../utils/format';

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

/** Envases que se cobran en total: la suma de lo que el back informa por renglón (el importe no se calcula acá). */
export const containersChargedCount = (items: ReadonlyArray<{ containersCharged?: number | null }>): number =>
  items.reduce((sum, item) => sum + (item.containersCharged ?? 0), 0);

/** «Envases (2)»: la línea del desglose con el cargo por los envases que el cliente no tenía. */
export const containerChargeLabel = (count: number): string => `Envases (${count})`;

/**
 * La aclaración bajo un renglón que cobra envases («+ 1 envase a $ 10.000»); `null` si el renglón no cobra
 * ninguno o el back no informó el precio.
 */
export const containerItemNote = (item: Pick<QuoteItem, 'containersCharged' | 'containerUnitPrice'>): string | null => {
  if (!(item.containersCharged > 0) || item.containerUnitPrice === null) return null;
  const noun = item.containersCharged === 1 ? 'envase' : 'envases';
  return `+ ${item.containersCharged} ${noun} a ${formatCurrency(item.containerUnitPrice)}`;
};

/** Código del 400 de la cotización cuando un tipo cobra envases y la distribuidora no cargó su precio en el catálogo. */
const MISSING_CONTAINER_PRICE = 'CONTAINER_PRICE_MISSING';

/** Recibe el error tal como lo deja la consulta (axios crudo o ApiError): se normaliza con `toApiError`. */
export const isMissingContainerPrice = (error: unknown): boolean => {
  const apiError = toApiError(error);
  return apiError.status === 400 && apiError.code === MISSING_CONTAINER_PRICE;
};
