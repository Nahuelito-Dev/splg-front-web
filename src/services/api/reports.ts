import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  CobrosDeEfectivo,
  ComparativoDeVentas,
  EvolucionDeVentas,
  Impagos,
  VentasPorChoferV2,
  VentasPorMedioDePagoV2,
  VentasPorProductoV2,
} from './types';

/** Los informes con totales sólo existen en la v2 de la API. */
const v2 = { baseURL: env.apiUrlV2 };

export interface ReportsDateRange {
  /** YYYY-MM-DD. Sin rango, el back usa "hoy 00:00 hasta ahora". */
  from?: string;
  to?: string;
}

export interface SalesSummaryParams extends ReportsDateRange {
  /** Con `false` el back no calcula el período anterior (`previous` viene en null). */
  compare?: boolean;
}

export interface SalesEvolutionParams extends ReportsDateRange {
  granularity: 'day' | 'week' | 'month';
}

const dateQuery = ({ from, to }: ReportsDateRange) => ({ from: from || undefined, to: to || undefined });

/** GET /v2/reports/sales-by-driver: ventas por repartidor, de mayor a menor, con los totales que calcula el back. */
export const getSalesByDriver = async (range: ReportsDateRange): Promise<VentasPorChoferV2> => {
  const { data } = await http.get<VentasPorChoferV2>('/reports/sales-by-driver', { ...v2, params: dateQuery(range) });
  return data;
};

/** GET /v2/reports/sales-by-product: ventas por producto, de mayor a menor, con los totales que calcula el back. */
export const getSalesByProduct = async (range: ReportsDateRange): Promise<VentasPorProductoV2> => {
  const { data } = await http.get<VentasPorProductoV2>('/reports/sales-by-product', {
    ...v2,
    params: dateQuery(range),
  });
  return data;
};

/** GET /v2/reports/sales-by-payment: ventas por método de pago, de mayor a menor, con los totales que calcula el back. */
export const getSalesByPayment = async (range: ReportsDateRange): Promise<VentasPorMedioDePagoV2> => {
  const { data } = await http.get<VentasPorMedioDePagoV2>('/reports/sales-by-payment', {
    ...v2,
    params: dateQuery(range),
  });
  return data;
};

/** GET /v2/reports/sales-summary: ventas, pedidos y ticket promedio del rango y del período anterior. */
export const getSalesSummary = async (range: SalesSummaryParams): Promise<ComparativoDeVentas> => {
  const { data } = await http.get<ComparativoDeVentas>('/reports/sales-summary', {
    ...v2,
    params: { ...dateQuery(range), compare: range.compare === false ? false : undefined },
  });
  return data;
};

/** GET /v2/reports/unpaid-total: pedidos con el cobro impago y lo adeudado en total. */
export const getUnpaidTotal = async (): Promise<Impagos> => {
  const { data } = await http.get<Impagos>('/reports/unpaid-total', v2);
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

/** GET /reports/collections: efectivo pendiente de confirmar, impagos sin resolver y pérdidas del rango. */
export const getCollections = async (range: ReportsDateRange): Promise<CobrosDeEfectivo> => {
  const { data } = await http.get<CobrosDeEfectivo>('/reports/collections', { params: dateQuery(range) });
  return data;
};
