import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '../config/env';

// URL del gateway de sockets: ver config/entorno.
const SOCKET_URL = env.socketUrl;

export type SocketAuthPayload = Record<string, unknown>;
/** Handshake que se arma en cada (re)conexión, para mandar siempre un token vigente. */
export type SocketAuthProvider = () => Promise<SocketAuthPayload>;

// Los eventos del ciclo de vida de un pedido que el AdminGateway emite a la
// sala de la distribuidora. "En camino" es `order:on-the-way`, el mismo nombre
// que recibe la app del cliente.
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

/** Evento que emite el AdminGateway cuando el back guarda un aviso nuevo en la bandeja del admin. */
export const ADMIN_NOTIFICATION_EVENT = 'admin:notification';

/** Payload de ADMIN_NOTIFICATION_EVENT: el aviso guardado más la distribuidora a la que pertenece. */
export interface AdminNotificationPayload {
  id: string;
  kind: string;
  title: string;
  body: string;
  distributorId?: string | null;
}

/** Evento que emite el AdminGateway con cada incidencia de reparto nueva (también los cobros impagos). */
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

/** Evento que emite el AdminGateway cuando un cliente abre un reclamo. */
export const CLAIM_CREATED_EVENT = 'claim:created';

/** Payload de CLAIM_CREATED_EVENT. */
export interface ClaimCreatedPayload {
  claimId: string;
  orderId: string;
  distributorId?: string;
  reason: string;
  createdAt?: string;
}

/**
 * El back corta la conexión porque venció el token del handshake: hay que volver a conectar (con uno nuevo).
 * Con `SESSION_ACCESS_REVOKED_EVENT` (bloqueo o baja de la cuenta) no se reconecta.
 */
export const SESSION_EXPIRED_EVENT = 'server:session-expired';
export const SESSION_ACCESS_REVOKED_EVENT = 'server:access-revoked';

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
 * Evento que emite el back a los admins de la distribuidora cuando el cliente sube el comprobante de una
 * transferencia (API v2).
 */
export const TRANSFER_RECEIPT_UPLOADED_EVENT = 'order:transfer-receipt-uploaded';

/** Payload de TRANSFER_RECEIPT_UPLOADED_EVENT. */
export interface TransferReceiptUploadedPayload {
  orderId: string;
  customerId: string;
  attachmentId: string;
  uploadedAt: string;
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
 * Eventos de la hoja de ruta en curso que el back emite a la sala de la distribuidora (HOJA-DE-RUTA.md, «Eventos de
 * socket»). Todos traen `sheetId`; el panel vuelve a pedir el seguimiento, salvo `eta-updated`, que trae las horas.
 */
export const ROUTE_SHEET_SOCKET_EVENTS = {
  ASSIGNED: 'route-sheet:assigned',
  STARTED: 'route-sheet:started',
  WAIT_EXPIRED: 'route-sheet:wait-expired',
  STOP_PROGRESS: 'route-sheet:stop-progress',
  STOP_FAILED: 'route-sheet:stop-failed',
  UPDATED: 'route-sheet:updated',
  ETA_UPDATED: 'route-sheet:eta-updated',
  STOP_LATE: 'route-sheet:stop-late',
  CLOSED: 'route-sheet:closed',
} as const;

/** Lo mínimo que traen todos los eventos de la hoja. */
export interface RouteSheetEventPayload {
  sheetId: string;
  orderId?: string;
}

/** Posición del chofer durante toda la hoja en curso, al ritmo del recálculo de la hora estimada. */
export const ROUTE_SHEET_DRIVER_LOCATION_EVENT = 'route-sheet:driver-location';

/** Payload de ROUTE_SHEET_DRIVER_LOCATION_EVENT. */
export interface RouteSheetDriverLocationPayload {
  sheetId: string;
  driverUserId: string;
  lat: number;
  lng: number;
  at: string;
}

/** Un pedido se reprogramó para otro día (segundo intento fallido o cierre a mano). */
export const ORDER_RESCHEDULED_EVENT = 'order:rescheduled';

/** Payload de ORDER_RESCHEDULED_EVENT. */
export interface OrderRescheduledPayload {
  orderId: string;
  scheduledDate: string | null;
}

/** Payload de `route-sheet:eta-updated`: las horas nuevas de lo que falta, sin recargar. */
export interface RouteSheetEtaUpdatedPayload {
  sheetId: string;
  source: 'gps' | 'last_stop' | 'warehouse' | 'none';
  stops: { orderId: string; etaAt: string; late: boolean }[];
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

    const socket = socketRef.current;
    // Si el back corta, socket.io no reconecta solo: sólo se vuelve cuando el corte fue por el token vencido.
    let reconnectOnServerCut = false;
    socket.on(SESSION_EXPIRED_EVENT, () => {
      reconnectOnServerCut = true;
    });
    socket.on(SESSION_ACCESS_REVOKED_EVENT, () => {
      reconnectOnServerCut = false;
    });
    socket.on('connect', () => setIsOnline(true));
    socket.on('disconnect', (reason) => {
      setIsOnline(false);
      if (reason === 'io server disconnect' && reconnectOnServerCut) {
        reconnectOnServerCut = false;
        socket.connect();
      }
    });
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
