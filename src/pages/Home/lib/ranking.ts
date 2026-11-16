import type { VentasPorChofer } from '../../../services/api/types';

export interface DriverRank {
  id: string;
  name: string;
  orders: number;
  sales: number;
}

/** Los primeros choferes del reporte, que el back ya manda de mayor a menor venta (`driverId` = id de usuario). */
export const rankDrivers = (sales: VentasPorChofer[], limit = 5): DriverRank[] =>
  sales.slice(0, limit).map((row) => ({
    id: row.driverId,
    name: row.driverName ?? 'Chofer sin nombre',
    orders: row.totalOrders,
    sales: row.totalSales,
  }));

/** Texto de la calificación: sin calificaciones no hay promedio que mostrar (no es un 0,0). */
export const ratingText = (summary: { average: number; count: number } | undefined): string | null =>
  summary && summary.count > 0 ? summary.average.toFixed(1).replace('.', ',') : null;
