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
  // El cliente cambió la dirección de entrega (CU-127): la ficha y las listas se refrescan.
  ADDRESS_CHANGED: 'order:address-changed',
} as const;

export type OrderSocketEventName = (typeof ORDER_SOCKET_EVENTS)[keyof typeof ORDER_SOCKET_EVENTS];

/** Motivos por los que un pedido pendiente se queda sin chofer a quien ofrecerlo (`MotivoSinChoferes` del back). */
export type NoDriversReason = 'no_drivers_in_range' | 'all_drivers_exhausted' | 'no_delivery_point';

/**
 * Evento que emite el DispatchOrchestratorService a los admins de la distribuidora cuando un pedido pendiente ya no
 * tiene candidatos (una sola vez por agotamiento).
 */
export const NO_DRIVERS_EVENT = 'order:no-drivers';

/**
 * Evento que emite el barrido de zonas vencidas (CU-151) a los admins de la distribuidora cuando apaga su última
 * zona de cobertura activa: desde ese momento no cubre ninguna dirección.
 */
export const NO_ACTIVE_ZONES_EVENT = 'coverage:no-active-zones';

/** Payload de NO_ACTIVE_ZONES_EVENT. */
export interface NoActiveZonesPayload {
  distributorId?: string | null;
  zoneIds: string[];
  at?: string;
}

/** Payload de NO_DRIVERS_EVENT. */
export interface NoDriversPayload {
  orderId: string;
  distributorId?: string | null;
  reason: NoDriversReason;
  at?: string;
}

/**
 * Evento que emite el AdminGateway cuando el back rechaza despachar envases con la revisión vencida (asignación a un
 * pedido o transición a `dispatched`).
 */
export const CYLINDER_BLOCKED_EVENT = 'cylinder:dispatch-blocked';

/** Payload de CYLINDER_BLOCKED_EVENT: `orderId` es null si el despacho fue una transición suelta. */
export interface CylinderBlockedPayload {
  orderId: string | null;
  distributorId?: string | null;
  serials: string[];
}

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
 * Evento que emite el back a los admins de la distribuidora cuando un reintegro automático falla (la devolución del
 * pago de un pedido cancelado no se pudo hacer: hay que resolverla a mano).
 */
export const REFUND_FAILED_EVENT = 'order:refund-failed';

/** Payload de REFUND_FAILED_EVENT. */
export interface RefundFailedPayload {
  orderId: string;
  refundId?: string;
  kind?: string;
  amount?: number;
  reason?: string;
  distributorId?: string | null;
  at?: string;
}

/**
 * Evento que emite el back a los admins de la distribuidora cuando el cliente modifica un pedido.
 */
export const ORDER_UPDATED_EVENT = 'order:updated';

/** Payload de ORDER_UPDATED_EVENT. */
export interface OrderUpdatedPayload {
  orderId: string;
  distributorId?: string | null;
  totalAmount: number;
  status?: string;
}

/**
 * Evento que emite el back a los admins de la distribuidora cuando se reintegra un pago.
 */
export const PAYMENT_REFUNDED_EVENT = 'order:payment-refunded';

/** Payload de PAYMENT_REFUNDED_EVENT. */
export interface PaymentRefundedPayload {
  orderId: string;
  refundId: string;
  kind?: string;
  amount: number;
  at: string;
  distributorId?: string | null;
}

/**
 * Evento que emite el back a los admins de la distribuidora cuando un pedido express pasa al reparto común.
 */
export const EXPRESS_DEGRADED_EVENT = 'order:express-degraded';

/** Payload de EXPRESS_DEGRADED_EVENT. */
export interface ExpressDegradedPayload {
  orderId: string;
  surchargeRemoved: number;
  total: number;
  refundRequested: boolean;
  refundFailed: boolean;
  message: string;
  distributorId?: string | null;
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
