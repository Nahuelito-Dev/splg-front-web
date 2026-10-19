import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '../../context/useSocketContext';
import { useDistributorEventFilter } from '../../hooks/useDistributorEventFilter';
import { ORDER_SOCKET_EVENTS, type OrderSocketEventName } from '../../hooks/useSocket';
import { queryKeys } from '../../services/queries/queryKeys';

/** Cuánto se junta una ráfaga de eventos (un pedido que cambia de estado emite varios) antes de volver a pedir. */
const COALESCE_MS = 400;
/** Sondeo de respaldo cuando el socket no está conectado. */
export const POLL_FALLBACK_MS = 20_000;

/**
 * Mantiene el tablero al día: cada evento del ciclo de vida de un pedido (de la distribuidora que se mira) vuelve a
 * pedir los listados. Devuelve si el socket está en línea y el intervalo de respaldo para las consultas.
 */
export const useDispatchBoardSync = () => {
  const queryClient = useQueryClient();
  const { isOnline, subscribe } = useSocketContext();
  const belongsHere = useDistributorEventFilter();

  // Un evento que se perdió con el socket caído no vuelve: al reconectar se piden de nuevo los listados.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) void queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    wasOnline.current = isOnline;
  }, [isOnline, queryClient]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const orderIds = new Set<string>();
    const refresh = (payload?: { orderId?: string; distributorId?: string | null }) => {
      if (!belongsHere(payload)) return;
      if (payload?.orderId) orderIds.add(payload.orderId);
      clearTimeout(timer);
      timer = setTimeout(() => {
        // `cancelRefetch: false`: si ya hay una recarga en vuelo (p. ej. la de la propia asignación), se reutiliza.
        const options = { cancelRefetch: false };
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() }, options);
        orderIds.forEach(
          (id) => void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) }, options),
        );
        orderIds.clear();
      }, COALESCE_MS);
    };
    const unsubscribers = (Object.values(ORDER_SOCKET_EVENTS) as OrderSocketEventName[]).map((event) =>
      subscribe<{ orderId?: string; distributorId?: string | null }>(event, refresh),
    );
    return () => {
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [subscribe, queryClient, belongsHere]);

  return { isOnline, refetchInterval: isOnline ? (false as const) : POLL_FALLBACK_MS };
};
