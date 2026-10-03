import { useMemo } from 'react';
import { useSalesEvolution } from '../../../services/queries/reports';
import { dayKey, dayRange, fillDays, type SalesPoint } from './series';

/** Dos períodos de 30 días: el actual y el anterior, para comparar. */
export const DAILY_WINDOW = 60;

/** Ventas por día de los últimos 60 días (GET /reports/sales-evolution), con los días sin ventas en cero. */
export const useDailySales = () => {
  const today = dayKey(new Date());
  const query = useSalesEvolution({ granularity: 'day', ...dayRange(today, DAILY_WINDOW) });
  const points: SalesPoint[] = useMemo(() => fillDays(query.data ?? [], today, DAILY_WINDOW), [query.data, today]);
  return { points, today, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
};
