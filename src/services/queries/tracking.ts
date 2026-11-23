import { useQuery } from '@tanstack/react-query';
import { getLiveFleet } from '../api/tracking';
import { queryKeys } from './queryKeys';

export const liveFleetKey = queryKeys.liveFleet.list();

interface Options {
  enabled?: boolean;
  /** Respaldo del socket: cada cuánto se vuelve a pedir. */
  refetchInterval?: number | false;
}

/** Los vehículos en uso ahora (seguimiento en vivo). */
export const useLiveFleet = ({ enabled = true, refetchInterval = false }: Options = {}) =>
  useQuery({ queryKey: liveFleetKey, queryFn: getLiveFleet, enabled, refetchInterval });
