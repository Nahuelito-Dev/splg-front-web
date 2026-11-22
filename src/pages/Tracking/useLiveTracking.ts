import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocketContext } from '../../context/useSocketContext';
import { usePermissions } from '../../hooks';
import { useDistributorEventFilter } from '../../hooks/useDistributorEventFilter';
import {
  DRIVER_LOCATION_EVENT,
  ORDER_SOCKET_EVENTS,
  ROUTE_SHEET_DRIVER_LOCATION_EVENT,
  ROUTE_SHEET_SOCKET_EVENTS,
  type RouteSheetDriverLocationPayload,
} from '../../hooks/useSocket';
import type { LiveVehicle, LiveVehicleLocation } from '../../services/api/types';
import { liveFleetKey, useLiveFleet } from '../../services/queries/tracking';
import type { DriverLocationPayload, TrackedOrder } from './types';

/** Cuánto se junta una ráfaga de eventos antes de volver a pedir la lista. */
const COALESCE_MS = 400;
/** Respaldo del socket: con él caído (o en modo soporte, sin tiempo real) se vuelve a pedir cada 20 s. */
export const LIVE_FLEET_POLL_MS = 20_000;
/** Con el socket en línea, igual se relee cada minuto por si se perdió un evento. */
export const LIVE_FLEET_REFRESH_MS = 60_000;

/** Los eventos que cambian qué vehículos hay, su estado o sus paradas. */
const REFRESH_EVENTS: readonly string[] = [
  ...Object.values(ORDER_SOCKET_EVENTS),
  ...Object.values(ROUTE_SHEET_SOCKET_EVENTS),
];

const newer = (a: LiveVehicleLocation | null, b: LiveVehicleLocation | undefined): LiveVehicleLocation | null => {
  if (!b) return a;
  if (!a?.at || !b.at) return b;
  return new Date(b.at).getTime() >= new Date(a.at).getTime() ? b : a;
};

/**
 * El seguimiento en vivo: los vehículos en uso (`GET /v2/tracking/vehicles`) con la posición que va llegando por el
 * socket encima de la que trajo la API, y los pedidos que mandan posición sin un vehículo en uso detrás. Cualquier
 * evento de pedido o de hoja de ruta vuelve a pedir la lista.
 */
export const useLiveTracking = () => {
  const queryClient = useQueryClient();
  const { isOnline, subscribe } = useSocketContext();
  const { needsDistributor, readOnly } = usePermissions();
  const belongsHere = useDistributorEventFilter();
  const realtime = isOnline && !readOnly;
  const fleet = useLiveFleet({
    enabled: !needsDistributor,
    refetchInterval: realtime ? LIVE_FLEET_REFRESH_MS : LIVE_FLEET_POLL_MS,
  });
  /** Última posición por usuario del chofer. */
  const [positions, setPositions] = useState<Record<string, LiveVehicleLocation>>({});
  const [trackedOrders, setTrackedOrders] = useState<Record<string, TrackedOrder>>({});

  useEffect(() => {
    // Los eventos pueden llegar desordenados: uno más viejo que la última posición conocida se descarta.
    const move = (driverUserId: string, lat: number, lng: number, at: string) =>
      setPositions((prev) => {
        const last = prev[driverUserId];
        const next = newer(last ?? null, { lat, lng, at });
        return next === last || !next ? prev : { ...prev, [driverUserId]: next };
      });
    const offOrder = subscribe<DriverLocationPayload>(DRIVER_LOCATION_EVENT, (payload) => {
      if (!payload?.orderId) return;
      move(payload.driverId, payload.lat, payload.lng, payload.at);
      setTrackedOrders((prev) => {
        const last = prev[payload.orderId];
        return last && new Date(payload.at).getTime() < new Date(last.at).getTime()
          ? prev
          : { ...prev, [payload.orderId]: payload };
      });
    });
    const offSheet = subscribe<RouteSheetDriverLocationPayload>(ROUTE_SHEET_DRIVER_LOCATION_EVENT, (payload) => {
      if (payload?.driverUserId) move(payload.driverUserId, payload.lat, payload.lng, payload.at);
    });
    return () => {
      offOrder();
      offSheet();
    };
  }, [subscribe]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = (payload?: { distributorId?: string | null }) => {
      if (!belongsHere(payload)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: liveFleetKey }, { cancelRefetch: false });
      }, COALESCE_MS);
    };
    const offs = REFRESH_EVENTS.map((event) => subscribe<{ distributorId?: string | null }>(event, refresh));
    return () => {
      clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, [subscribe, queryClient, belongsHere]);

  // Un evento que se perdió con el socket caído no vuelve: al reconectar se pide de nuevo.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) void queryClient.invalidateQueries({ queryKey: liveFleetKey });
    wasOnline.current = isOnline;
  }, [isOnline, queryClient]);

  const data = fleet.data;
  const vehicles = useMemo(
    (): LiveVehicle[] =>
      (data?.vehicles ?? []).map((vehicle) => ({
        ...vehicle,
        location: newer(vehicle.location, positions[vehicle.driver.userId]),
      })),
    [data, positions],
  );
  /** Pedidos que mandan posición y cuyo chofer no tiene un vehículo en uso: se dibujan igual en el mapa. */
  const looseOrders = useMemo(() => {
    const withVehicle = new Set(vehicles.map((vehicle) => vehicle.driver.userId));
    return Object.values(trackedOrders)
      .filter((order) => !withVehicle.has(order.driverId))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [trackedOrders, vehicles]);

  return {
    isOnline,
    realtime,
    needsDistributor,
    vehicles,
    looseOrders,
    isLoading: fleet.isPending && !needsDistributor,
    isError: fleet.isError && !data,
    error: fleet.error,
    refetch: () => void fleet.refetch(),
  };
};
