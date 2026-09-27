import { http } from './httpClient';
import type { EvolucionDeVentas, VentasPorChofer, VentasPorMedioDePago, VentasPorProducto } from './types';

export interface ReportsDateRange {
  /** YYYY-MM-DD. Sin rango, el back usa "hoy 00:00 hasta ahora". */
  from?: string;
  to?: string;
}

export interface SalesEvolutionParams extends ReportsDateRange {
  granularity: 'day' | 'week' | 'month';
}

const dateQuery = ({ from, to }: ReportsDateRange) => ({ from: from || undefined, to: to || undefined });

/** GET /reports/sales-by-driver: ventas entregadas agrupadas por repartidor. */
export const getSalesByDriver = async (range: ReportsDateRange): Promise<VentasPorChofer[]> => {
  const { data } = await http.get<VentasPorChofer[]>('/reports/sales-by-driver', { params: dateQuery(range) });
  return data;
};

/** GET /reports/sales-by-product: ventas entregadas agrupadas por producto. */
export const getSalesByProduct = async (range: ReportsDateRange): Promise<VentasPorProducto[]> => {
  const { data } = await http.get<VentasPorProducto[]>('/reports/sales-by-product', { params: dateQuery(range) });
  return data;
};

/** GET /reports/sales-by-payment: ventas entregadas agrupadas por método de pago. */
export const getSalesByPayment = async (range: ReportsDateRange): Promise<VentasPorMedioDePago[]> => {
  const { data } = await http.get<VentasPorMedioDePago[]>('/reports/sales-by-payment', { params: dateQuery(range) });
  return data;
};

/** GET /reports/sales-evolution: ventas entregadas agrupadas por período (día/semana/mes). */
export const getSalesEvolution = async ({
  granularity,
  ...range
}: SalesEvolutionParams): Promise<EvolucionDeVentas[]> => {
  const { data } = await http.get<EvolucionDeVentas[]>('/reports/sales-evolution', {
    params: { ...dateQuery(range), granularity },
  });
  return data;
};
