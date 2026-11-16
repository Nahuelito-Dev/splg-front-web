import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSocketContext } from '../../context/useSocketContext';
import { useDistributorEventFilter } from '../../hooks/useDistributorEventFilter';
import {
  DRIVER_LOCATION_EVENT,
  ORDER_RESCHEDULED_EVENT,
  ROUTE_SHEET_DRIVER_LOCATION_EVENT,
  ROUTE_SHEET_SOCKET_EVENTS,
  type DriverLocationPayload,
  type OrderRescheduledPayload,
  type RouteSheetDriverLocationPayload,
  type RouteSheetEtaUpdatedPayload,
  type RouteSheetEventPayload,
} from '../../hooks/useSocket';
import type { RouteSheetExecution } from '../../services/api/types';
import { queryKeys } from '../../services/queries/queryKeys';
import { routeSheetKeys, withEtas } from '../../services/queries/routeSheets';

/** Cuánto se junta una ráfaga de eventos (entregar emite varios) antes de volver a pedir. */
const COALESCE_MS = 400;

/** Respaldo del socket: con él caído (o en modo soporte, que no recibe tiempo real) se vuelve a pedir cada 20 s. */
export const LIVE_POLL_MS = 20_000;
/** Con el socket en línea, igual se relee cada minuto por si se perdió un evento. */
export const LIVE_REFRESH_MS = 60_000;

/**
 * El seguimiento en vivo de una hoja en curso: las horas nuevas (`route-sheet:eta-updated`) se aplican sin recargar,
 * la posición del chofer llega con `route-sheet:driver-location` (toda la hoja) y cualquier otro evento de la hoja, o
 * la reprogramación de uno de sus pedidos, vuelve a pedir el seguimiento y el día.
 */
export const useRouteSheetLive = (sheetId: string | undefined, execution: RouteSheetExecution | undefined) => {
  const queryClient = useQueryClient();
  const { isOnline, subscribe } = useSocketContext();
  const belongsHere = useDistributorEventFilter();
  // Los pedidos de la hoja cambian con cada evento: se leen de una ref para no volver a suscribirse.
  const orderIds = useRef<Set<string>>(new Set());
  orderIds.current = new Set(execution?.stops.map((s) => s.orderId) ?? []);

  // Un evento que se perdió con el socket caído no vuelve: al reconectar se pide de nuevo.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (sheetId && isOnline && !wasOnline.current) {
      void queryClient.invalidateQueries({ queryKey: routeSheetKeys.execution(sheetId) });
    }
    wasOnline.current = isOnline;
  }, [isOnline, queryClient, sheetId]);

  useEffect(() => {
    if (!sheetId) return undefined;
    const key = routeSheetKeys.execution(sheetId);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = (payload?: RouteSheetEventPayload & { distributorId?: string | null }) => {
      if (payload?.sheetId !== sheetId || !belongsHere(payload)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const options = { cancelRefetch: false };
        void queryClient.invalidateQueries({ queryKey: routeSheetKeys.detail(sheetId) }, options);
        void queryClient.invalidateQueries({ queryKey: queryKeys.routePlans.all }, options);
      }, COALESCE_MS);
    };

    const etas = (payload: RouteSheetEtaUpdatedPayload) => {
      if (payload?.sheetId !== sheetId || !Array.isArray(payload.stops)) return;
      queryClient.setQueryData<RouteSheetExecution>(key, (current?: RouteSheetExecution) =>
        withEtas(current, payload.stops),
      );
    };

    const moveDriver = (lat: number, lng: number, at: string) => {
      queryClient.setQueryData<RouteSheetExecution>(key, (current?: RouteSheetExecution) =>
        current && current.status === 'assigned' ? { ...current, driverLocation: { lat, lng, at } } : current,
      );
    };

    // La posición llega durante toda la hoja en curso; la del pedido en camino queda como respaldo.
    const sheetDriverAt = (payload: RouteSheetDriverLocationPayload) => {
      if (payload?.sheetId === sheetId) moveDriver(payload.lat, payload.lng, payload.at);
    };
    const orderDriverAt = (payload: DriverLocationPayload) => {
      if (payload && orderIds.current.has(payload.orderId)) moveDriver(payload.lat, payload.lng, payload.at);
    };

    // Un pedido de la hoja se reprogramó para otro día: el evento no trae la hoja, se la reconoce por el pedido.
    const rescheduled = (payload: OrderRescheduledPayload) => {
      if (payload && orderIds.current.has(payload.orderId)) refresh({ sheetId });
    };

    const { ETA_UPDATED, ...others } = ROUTE_SHEET_SOCKET_EVENTS;
    const unsubscribers = Object.values(others).map((event) => subscribe<RouteSheetEventPayload>(event, refresh));
    unsubscribers.push(subscribe<RouteSheetEtaUpdatedPayload>(ETA_UPDATED, etas));
    unsubscribers.push(subscribe<RouteSheetDriverLocationPayload>(ROUTE_SHEET_DRIVER_LOCATION_EVENT, sheetDriverAt));
    unsubscribers.push(subscribe<DriverLocationPayload>(DRIVER_LOCATION_EVENT, orderDriverAt));
    unsubscribers.push(subscribe<OrderRescheduledPayload>(ORDER_RESCHEDULED_EVENT, rescheduled));
    return () => {
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [sheetId, subscribe, queryClient, belongsHere]);

  return { isOnline };
};
