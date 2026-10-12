import { useQuery } from '@tanstack/react-query';
import {
  getCollections,
  getSalesByDriver,
  getSalesByPayment,
  getSalesByProduct,
  getSalesEvolution,
  type ReportsDateRange,
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
