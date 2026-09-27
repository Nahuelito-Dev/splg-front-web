import { http } from './httpClient';
import type { OrderStats, SalesChartPoint } from './types';

/** GET /orders/stats/summary: pedidos, ventas, rendimiento y medios de pago (scopeado por distribuidora). */
export const getOrderStats = async (): Promise<OrderStats> => {
  const { data } = await http.get<OrderStats>('/orders/stats/summary');
  return data;
};

/** GET /orders/stats/chart: ventas de los últimos 7 días, para el gráfico del tablero. */
export const getSalesChart = async (): Promise<SalesChartPoint[]> => {
  const { data } = await http.get<SalesChartPoint[]>('/orders/stats/chart');
  return data;
};
