import { useQuery } from '@tanstack/react-query';
import { getDispatchMetrics } from '../api/dispatchMetrics';
import { queryKeys } from './queryKeys';

const keys = queryKeys.dispatchMetrics;

/** Son números de un período largo: no cambian a cada pedido, se releen al volver a la pantalla. */
const STALE_MS = 60_000;

export const useDispatchMetrics = (enabled = true) =>
  useQuery({ queryKey: keys.detail('last30'), queryFn: getDispatchMetrics, enabled, staleTime: STALE_MS });
