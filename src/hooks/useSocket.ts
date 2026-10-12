import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '../config/env';

// URL del gateway de sockets: ver config/entorno.
const SOCKET_URL = env.socketUrl;

export type SocketAuthPayload = Record<string, unknown>;
/** Handshake que se arma en cada (re)conexión, para mandar siempre un token vigente. */
export type SocketAuthProvider = () => Promise<SocketAuthPayload>;

// Los eventos del ciclo de vida de un pedido que el AdminGateway emite a la
// sala de la distribuidora. "En camino" se escucha con su nombre canónico: el
// back sigue emitiendo también `order:on_the_way` por compatibilidad, y escuchar
// los dos duplicaría cada aviso.
export const ORDER_SOCKET_EVENTS = {
  CREATED: 'order:created',
  ACCEPTED: 'order:accepted',
  ON_THE_WAY: 'order:on-the-way',
  DELIVERED: 'order:delivered',
  CANCELLED: 'order:cancelled',
  RELEASED: 'order:pending',
  ASSIGNMENT_DECLINED: 'order:assignment-declined',
} as const;

export type OrderSocketEventName = (typeof ORDER_SOCKET_EVENTS)[keyof typeof ORDER_SOCKET_EVENTS];

/**
 * Evento que emite el AdminGateway cuando se abre una incidencia de reparto. El panel sólo avisa las de tipo
 * `unpaid_collection` (el chofer informó que no pudo cobrar en efectivo).
 */
export const INCIDENT_CREATED_EVENT = 'incident:created';

/** Payload de INCIDENT_CREATED_EVENT. */
export interface IncidentCreatedPayload {
  incidentId: string;
  orderId: string;
  distributorId?: string;
  type: string;
  description?: string;
  createdAt?: string;
}

/**
 * Evento que emite el AdminGateway por cada pedido en curso cuyo chofer manda
 * su GPS. Se centraliza acá junto a ORDER_SOCKET_EVENTS (Tracking es hoy su
 * único consumidor).
 */
export const DRIVER_LOCATION_EVENT = 'order:driver-location';

/** Payload de DRIVER_LOCATION_EVENT: última posición conocida de un chofer. */
export interface DriverLocationPayload {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  at: string; // ISO date
}

/**
 * Hook de bajo nivel para manejar una única conexión de socket.io.
 * No conecta solo: el consumidor (típicamente el SocketProvider) decide
 * cuándo llamar a `connect`, por ejemplo una vez que hay sesión iniciada.
 */
export const useSocket = (namespace = '/') => {
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Se crea una sola vez (aunque el componente se re-renderice) y con
  // autoConnect en false: el socket existe pero no abre conexión todavía.
  if (!socketRef.current) {
    socketRef.current = io(`${SOCKET_URL}${namespace}`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current.on('connect', () => setIsOnline(true));
    socketRef.current.on('disconnect', () => setIsOnline(false));
    socketRef.current.on('connect_error', (error) => {
      console.error('[useSocket] Error de conexión:', error.message);
      setIsOnline(false);
    });
  }

  const connect = useCallback((auth?: SocketAuthPayload | SocketAuthProvider) => {
    const socket = socketRef.current;
    if (!socket || socket.connected) return;

    // `auth.token` es el handshake real: el AdminGateway lo valida (decodeToken)
    // y desconecta al cliente si falta o es inválido (ver socket-data.ts en el back).
    // Con una función, socket.io la vuelve a llamar en cada reconexión.
    socket.auth =
      typeof auth === 'function'
        ? (cb: (data: object) => void) => {
            void auth().then(cb, () => cb({}));
          }
        : (auth ?? {});
    socket.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setIsOnline(false);
  }, []);

  const subscribe = useCallback(<T = unknown>(event: string, handler: (payload: T) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, []);

  // Al desmontar el hook (se usa una sola vez, desde SocketProvider) cerramos
  // la conexión para no dejar sockets colgados. Antes se llamaba `.off()` sin
  // argumentos, que borra TODOS los listeners del socket —incluidos los
  // internos connect/disconnect/connect_error de arriba—; si el socket se
  // reusaba, la campana quedaba sin actualizar `isOnline`. Ahora limpiamos los
  // listeners de ESTE socket, lo desconectamos y nulamos la ref para que un
  // remount cree un socket nuevo con sus handlers.
  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { isOnline, connect, disconnect, subscribe };
};
