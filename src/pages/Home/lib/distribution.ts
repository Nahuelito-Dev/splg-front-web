import type { Order, VentasPorMedioDePago } from '../../../services/api/types';
import { PAYMENT_METHOD } from '../../../utils/statusLabels';

export const NO_ZONE = 'Sin zona';

export interface ZoneCount {
  name: string;
  orders: number;
}

/** Pedidos por zona de cobertura (los cancelados no cuentan), de mayor a menor. */
export const ordersByZone = (orders: Order[]): ZoneCount[] => {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const name = order.zone_surcharge?.name ?? NO_ZONE;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, orders: count }))
    .sort(
      (a, b) =>
        Number(a.name === NO_ZONE) - Number(b.name === NO_ZONE) ||
        b.orders - a.orders ||
        a.name.localeCompare(b.name, 'es'),
    );
};

export interface PaymentShare {
  method: string;
  label: string;
  orders: number;
  sales: number;
}

/** El nombre del método tal como lo muestra el panel; uno desconocido se muestra como vino. */
export const paymentLabel = (method: string): string =>
  method in PAYMENT_METHOD ? PAYMENT_METHOD[method as keyof typeof PAYMENT_METHOD].text : method;

/** Ventas por método de pago, en el orden en que las manda el back (de mayor a menor venta). */
export const paymentShares = (rows: VentasPorMedioDePago[]): PaymentShare[] =>
  rows.map((row) => ({
    method: row.method,
    label: paymentLabel(row.method),
    orders: row.totalOrders,
    sales: row.totalSales,
  }));
