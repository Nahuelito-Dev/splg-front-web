import { useQuery } from '@tanstack/react-query';
import {
  getCollections,
  getReportsOverview,
  type ReportsOverview,
  getSalesByDriver,
  getSalesByPayment,
  getSalesByProduct,
  getUnpaidTotal,
  getSalesEvolution,
  getSalesSummary,
  getVehicleUtilization,
  type ReportsDateRange,
  type SalesSummaryParams,
  type SalesEvolutionParams,
} from '../api/reports';
import { queryKeys } from './queryKeys';

const keys = queryKeys.reports;

export const useSalesByDriver = (range: ReportsDateRange) =>
  useQuery({
    queryKey: keys.list({ report: 'by-driver', ...range }),
    queryFn: () => getSalesByDriver(range),
  });

export const useSalesByProduct = (range: ReportsDateRange) =>
  useQuery({
    queryKey: keys.list({ report: 'by-product', ...range }),
    queryFn: () => getSalesByProduct(range),
  });

export const useSalesByPayment = (range: ReportsDateRange) =>
  useQuery({
    queryKey: keys.list({ report: 'by-payment', ...range }),
    queryFn: () => getSalesByPayment(range),
  });

export const useSalesEvolution = (params: SalesEvolutionParams, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list({ report: 'evolution', ...params }),
    queryFn: () => getSalesEvolution(params),
    enabled,
  });

export const useCollections = (range: ReportsDateRange) =>
  useQuery({
    queryKey: keys.list({ report: 'collections', ...range }),
    queryFn: () => getCollections(range),
  });

/** Ventas, pedidos y ticket promedio del rango y del período anterior, ya calculados por el back. */
export const useSalesSummary = (range: SalesSummaryParams, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list({ report: 'summary', ...range }),
    queryFn: () => getSalesSummary(range),
    enabled,
  });

/** Pedidos impagos y lo adeudado en total (no depende de la página de la lista). */
export const useUnpaidTotal = () =>
  useQuery({
    queryKey: keys.list({ report: 'unpaid-total' }),
    queryFn: getUnpaidTotal,
  });

/**
 * Resumen del período y ventas por chofer de Reportes, por GraphQL en una sola consulta. Las tarjetas y la tabla usan
 * su parte con `select` sobre la misma clave: comparten el pedido y la caché.
 */
const useReportsOverview = <T>(range: ReportsDateRange, select: (data: ReportsOverview) => T) =>
  useQuery({
    queryKey: keys.list({ report: 'overview', ...range }),
    queryFn: () => getReportsOverview(range),
    select,
  });

const pickSummary = (data: ReportsOverview) => data.salesSummary;
const pickDriverSales = (data: ReportsOverview) => data.salesByDriver;

/** Ventas, pedidos y ticket promedio del rango y del período anterior (GraphQL `salesSummary`). */
export const useReportsSummary = (range: ReportsDateRange) => useReportsOverview(range, pickSummary);

/** Ventas por chofer, de mayor a menor, con los totales del back (GraphQL `salesByDriver`). */
export const useReportsDriverSales = (range: ReportsDateRange) => useReportsOverview(range, pickDriverSales);

export const useVehicleUtilization = (range: ReportsDateRange, enabled = true) =>
  useQuery({
    queryKey: keys.list({ report: 'vehicle-utilization', ...range }),
    queryFn: () => getVehicleUtilization(range),
    enabled,
  });
