import { useQuery } from '@tanstack/react-query';
import { getOrderStats, getSalesChart } from '../api/stats';
import { queryKeys } from './queryKeys';

const keys = queryKeys.stats;

/** Refresca sola cada 30s: son los números "en vivo" del tablero. */
export const useOrderStats = () =>
  useQuery({
    queryKey: keys.detail('summary'),
    queryFn: getOrderStats,
    refetchInterval: 30_000,
  });

export const useSalesChart = () =>
  useQuery({
    queryKey: keys.detail('chart'),
    queryFn: getSalesChart,
    refetchInterval: 30_000,
  });
