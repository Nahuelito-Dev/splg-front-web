import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// URL del gateway de sockets del backend. Si no se define VITE_APP_SOCKET_URL
// caemos a la misma base que la API REST, sacándole el sufijo /api.
const SOCKET_URL: string =
  import.meta.env.VITE_APP_SOCKET_URL ??
  (import.meta.env.VITE_APP_API_URL as string)?.replace(/\/api\/?$/, '');

export type SocketAuthPayload = Record<string, unknown>;

// TODO(backend): centralizar acá todos los eventos que el gateway de Nest
// vaya emitiendo. Por ahora cubrimos el ciclo de vida de un pedido de garrafas.
export const ORDER_SOCKET_EVENTS = {
  CREATED: 'order:created',
  ACCEPTED: 'order:accepted',
  ON_THE_WAY: 'order:on_the_way',
  DELIVERED: 'order:delivered',
  CANCELLED: 'order:cancelled',
} as const;

export type OrderSocketEventName =
  (typeof ORDER_SOCKET_EVENTS)[keyof typeof ORDER_SOCKET_EVENTS];

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

  const connect = useCallback((auth?: SocketAuthPayload) => {
    const socket = socketRef.current;
    if (!socket || socket.connected) return;

    // TODO(backend): reemplazar por el handshake real (JWT/rol) cuando el
    // gateway lo valide. Hoy `auth` viaja como contexto informativo nomás.
    socket.auth = auth ?? {};
    socket.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setIsOnline(false);
  }, []);

  const subscribe = useCallback(
    <T = unknown>(event: string, handler: (payload: T) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    [],
  );

  // Al desmontar el hook (se usa una sola vez, desde SocketProvider) cerramos
  // la conexión para no dejar sockets colgados.
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off();
    };
  }, []);

  return { isOnline, connect, disconnect, subscribe };
};
