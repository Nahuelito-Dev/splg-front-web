import { useQuery } from '@tanstack/react-query';
import {
  getCollections,
  getSalesByDriver,
  getSalesByPayment,
  getSalesByProduct,
  getUnpaidTotal,
  getSalesEvolution,
  getSalesSummary,
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
