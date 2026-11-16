import { useQuery, type QueryKey } from '@tanstack/react-query';
import {
  getChatMetrics,
  getPlatformChatMetrics,
  type ChatMetricsParams,
  type PlatformChatMetricsParams,
} from '../api/chatMetrics';
import { queryKeys } from './queryKeys';

const keys = queryKeys.chatMetrics;

/** Son números del período, no cambian a cada mensaje: se releen al volver a la pantalla. */
const STALE_MS = 60_000;

/**
 * Mientras llega otro período se deja el anterior (atenuado en la pantalla), pero sólo del mismo canal o empresa: los
 * números de otra selección no se muestran nunca bajo la nueva.
 */
const keepWithinScope =
  (scope: string) =>
  <T>(previous: T | undefined, previousQuery: { queryKey: QueryKey } | undefined): T | undefined =>
    previousQuery?.queryKey[3] === scope ? previous : undefined;

/** Las métricas de la empresa. `enabled` en falso mientras no se puede (sin permiso o con un período inválido). */
export const useChatMetrics = ({ channel, ...period }: ChatMetricsParams, enabled = true) => {
  const scope = channel ?? 'all';
  return useQuery({
    queryKey: [...keys.lists(), 'company', scope, period] as const,
    queryFn: () => getChatMetrics({ ...period, channel }),
    enabled,
    placeholderData: keepWithinScope(scope),
    staleTime: STALE_MS,
  });
};

/** Las métricas del soporte de la plataforma (todas las empresas o una). */
export const usePlatformChatMetrics = ({ distributorId, ...period }: PlatformChatMetricsParams, enabled = true) => {
  const scope = distributorId ?? 'all';
  return useQuery({
    queryKey: [...keys.lists(), 'platform', scope, period] as const,
    queryFn: () => getPlatformChatMetrics({ ...period, distributorId }),
    enabled,
    placeholderData: keepWithinScope(scope),
    staleTime: STALE_MS,
  });
};
