import { useCallback, useEffect, useState } from 'react';
import { Tooltip } from '@mui/material';
import {
  Bell,
  BellOff,
  CircleCheck,
  CircleX,
  ShieldAlert,
  HandCoins,
  MapPinned,
  MapPinOff,
  PackagePlus,
  RotateCcw,
  Undo2,
  ThumbsUp,
  Truck,
  UserRoundX,
  UserRoundSearch,
  ArrowDownToLine,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDistributorEventFilter } from '../../../../hooks/useDistributorEventFilter';
import { useSocketContext } from '../../../../context/useSocketContext';
import {
  CYLINDER_BLOCKED_EVENT,
  EXPRESS_DEGRADED_EVENT,
  INCIDENT_CREATED_EVENT,
  NO_ACTIVE_ZONES_EVENT,
  NO_DRIVERS_EVENT,
  ORDER_SOCKET_EVENTS,
  ORDER_UPDATED_EVENT,
  PAYMENT_REFUNDED_EVENT,
  TRANSFER_RECEIPT_UPLOADED_EVENT,
  type TransferReceiptUploadedPayload,
  REFUND_FAILED_EVENT,
  type CylinderBlockedPayload,
  type ExpressDegradedPayload,
  type IncidentCreatedPayload,
  type NoActiveZonesPayload,
  type NoDriversPayload,
  type NoDriversReason,
  type OrderSocketEventName,
  type OrderUpdatedPayload,
  type PaymentRefundedPayload,
  type RefundFailedPayload,
} from '../../../../hooks/useSocket';
import { queryKeys } from '../../../../services/queries/queryKeys';
import { notify } from '../../../../utils/notifications';
import { formatCurrency, formatShortId } from '../../../../utils/format';
import type { Tone } from '../../../../utils/statusLabels';
import { NotificationsDrawer, type NotificationsDrawerItem } from '../../ui/NotificationsDrawer';

/**
 * Payload real de los eventos `order:*` que emite `AdminGateway.notifyAdmins`
 * (`UpdateOrderStatusUseCase`, `CreateOrderUseCase` y `CancelOrderUseCase` en
 * el back): nunca viaja el nombre del cliente ni la dirección, sólo el id del
 * pedido, su estado/monto y, si se canceló, el motivo.
 */
interface OrderSocketPayload {
  orderId?: string;
  distributorId?: string | null;
  totalAmount?: number;
  reason?: string | null;
  /** Cuándo ocurrió, si el evento lo trae (ISO). */
  at?: string;
  /** Sólo en `order:assignment-declined`: el chofer que no confirmó. */
  driverName?: string;
  /** Sólo en `cylinder:dispatch-blocked`: los seriales vencidos. */
  serials?: string[];
  [key: string]: unknown;
}

/** Los eventos que la campana muestra: los del ciclo de vida del pedido y el aviso de un cobro impago. */
type NotificationEvent =
  | OrderSocketEventName
  | typeof INCIDENT_CREATED_EVENT
  | typeof NO_DRIVERS_EVENT
  | typeof CYLINDER_BLOCKED_EVENT
  | typeof NO_ACTIVE_ZONES_EVENT
  | typeof REFUND_FAILED_EVENT
  | typeof ORDER_UPDATED_EVENT
  | typeof PAYMENT_REFUNDED_EVENT
  | typeof EXPRESS_DEGRADED_EVENT
  | typeof TRANSFER_RECEIPT_UPLOADED_EVENT;

export interface OrderNotification {
  id: string;
  event: NotificationEvent;
  /** Lo que el evento dice del pedido: su id corto y, según el caso, el monto, el motivo o el chofer. */
  detail?: string;
  createdAt: string;
  read: boolean;
  /** Con qué pedido navegar al hacer click; `undefined` si el evento no trajo `orderId`. */
  orderId?: string;
}

const EVENT_LABELS: Record<NotificationEvent, string> = {
  [INCIDENT_CREATED_EVENT]: 'Cobro impago: el chofer no pudo cobrar',
  [NO_DRIVERS_EVENT]: 'Pedido sin chofer disponible',
  [CYLINDER_BLOCKED_EVENT]: 'Despacho bloqueado: envase con la revisión vencida',
  [REFUND_FAILED_EVENT]: 'No se pudo devolver el pago: resolvelo a mano',
  [NO_ACTIVE_ZONES_EVENT]: 'Sin zonas de cobertura activas: no se aceptan pedidos nuevos',
  [ORDER_UPDATED_EVENT]: 'El cliente modificó el pedido',
  [PAYMENT_REFUNDED_EVENT]: 'Se reintegró el pago del pedido',
  [EXPRESS_DEGRADED_EVENT]: 'El pedido express pasó al reparto común',
  [TRANSFER_RECEIPT_UPLOADED_EVENT]: 'El cliente subió el comprobante de transferencia',
  [ORDER_SOCKET_EVENTS.CREATED]: 'Nuevo pedido',
  [ORDER_SOCKET_EVENTS.ACCEPTED]: 'Pedido aceptado',
  [ORDER_SOCKET_EVENTS.ON_THE_WAY]: 'Pedido en camino',
  [ORDER_SOCKET_EVENTS.DELIVERED]: 'Pedido entregado',
  [ORDER_SOCKET_EVENTS.CANCELLED]: 'Pedido cancelado',
  [ORDER_SOCKET_EVENTS.RELEASED]: 'Pedido liberado, vuelve a buscar chofer',
  [ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED]: 'El chofer no confirmó la asignación',
  [ORDER_SOCKET_EVENTS.ADDRESS_CHANGED]: 'El cliente cambió la dirección de entrega',
};

const EVENT_VISUALS: Record<NotificationEvent, { icon: LucideIcon; tone: Tone }> = {
  [INCIDENT_CREATED_EVENT]: { icon: HandCoins, tone: 'danger' },
  [NO_DRIVERS_EVENT]: { icon: UserRoundSearch, tone: 'warn' },
  [CYLINDER_BLOCKED_EVENT]: { icon: ShieldAlert, tone: 'danger' },
  [NO_ACTIVE_ZONES_EVENT]: { icon: MapPinOff, tone: 'danger' },
  [REFUND_FAILED_EVENT]: { icon: Undo2, tone: 'danger' },
  [ORDER_UPDATED_EVENT]: { icon: RotateCcw, tone: 'info' },
  [PAYMENT_REFUNDED_EVENT]: { icon: ArrowDownToLine, tone: 'success' },
  [EXPRESS_DEGRADED_EVENT]: { icon: Truck, tone: 'warn' },
  [TRANSFER_RECEIPT_UPLOADED_EVENT]: { icon: Receipt, tone: 'success' },
  [ORDER_SOCKET_EVENTS.CREATED]: { icon: PackagePlus, tone: 'primary' },
  [ORDER_SOCKET_EVENTS.ACCEPTED]: { icon: ThumbsUp, tone: 'info' },
  [ORDER_SOCKET_EVENTS.ON_THE_WAY]: { icon: Truck, tone: 'info' },
  [ORDER_SOCKET_EVENTS.DELIVERED]: { icon: CircleCheck, tone: 'success' },
  [ORDER_SOCKET_EVENTS.CANCELLED]: { icon: CircleX, tone: 'danger' },
  [ORDER_SOCKET_EVENTS.RELEASED]: { icon: RotateCcw, tone: 'warn' },
  [ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED]: { icon: UserRoundX, tone: 'warn' },
  [ORDER_SOCKET_EVENTS.ADDRESS_CHANGED]: { icon: MapPinned, tone: 'info' },
};

const NO_DRIVERS_REASONS: Record<NoDriversReason, string> = {
  no_drivers_in_range: 'no hay choferes dentro del radio máximo',
  all_drivers_exhausted: 'ya se ofreció a todos los choferes disponibles',
  no_delivery_point: 'el pedido no tiene punto de entrega',
};

const MAX_NOTIFICATIONS = 50;

const buildDetail = (event: NotificationEvent, payload: OrderSocketPayload) => {
  const orderRef = payload.orderId ? formatShortId(payload.orderId) : '';
  const extra =
    event === CYLINDER_BLOCKED_EVENT
      ? (payload.serials ?? []).join(', ')
      : event === NO_DRIVERS_EVENT
        ? (NO_DRIVERS_REASONS[payload.reason as NoDriversReason] ?? payload.reason ?? '')
        : (event === ORDER_SOCKET_EVENTS.CANCELLED || event === REFUND_FAILED_EVENT) && payload.reason
          ? payload.reason
          : event === ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED && payload.driverName
            ? payload.driverName
            : event === ORDER_UPDATED_EVENT && typeof payload.totalAmount === 'number'
              ? formatCurrency(payload.totalAmount)
              : event === PAYMENT_REFUNDED_EVENT && typeof payload.totalAmount === 'number'
                ? formatCurrency(payload.totalAmount)
                : event === EXPRESS_DEGRADED_EVENT && typeof payload.totalAmount === 'number'
                  ? formatCurrency(payload.totalAmount)
                  : typeof payload.totalAmount === 'number'
                    ? formatCurrency(payload.totalAmount)
                    : '';
  return [orderRef, extra].filter(Boolean).join(' · ') || undefined;
};

const toDrawerItem = (notification: OrderNotification): NotificationsDrawerItem => ({
  id: notification.id,
  title: EVENT_LABELS[notification.event],
  detail: notification.detail,
  createdAt: notification.createdAt,
  read: notification.read,
  ...EVENT_VISUALS[notification.event],
});

export const NotificationBell = () => {
  const { isOnline, subscribe } = useSocketContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const belongsToView = useDistributorEventFilter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  const pushNotification = useCallback((event: NotificationEvent, payload: OrderSocketPayload = {}) => {
    const notification: OrderNotification = {
      id: `${event}-${payload.orderId ?? Date.now()}-${Math.random()}`,
      event,
      detail: buildDetail(event, payload),
      createdAt: payload.at ?? new Date().toISOString(),
      read: false,
      orderId: payload.orderId,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  useEffect(() => {
    const unsubscribers = (Object.values(ORDER_SOCKET_EVENTS) as OrderSocketEventName[]).map((event) =>
      subscribe<OrderSocketPayload>(event, (payload) => {
        if (belongsToView(payload)) pushNotification(event, payload);
      }),
    );

    // Sin choferes: el despacho agotó los candidatos y el pedido espera una asignación manual.
    unsubscribers.push(
      subscribe<NoDriversPayload>(NO_DRIVERS_EVENT, (payload) => {
        if (belongsToView(payload)) pushNotification(NO_DRIVERS_EVENT, { ...payload });
      }),
    );

    // Un despacho rechazado por vencimiento: el aviso lleva los seriales; sin pedido, no hay a dónde navegar.
    unsubscribers.push(
      subscribe<CylinderBlockedPayload>(CYLINDER_BLOCKED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(CYLINDER_BLOCKED_EVENT, {
          orderId: payload.orderId ?? undefined,
          serials: payload.serials,
        });
        notify.info(`Despacho bloqueado: revisión vencida (${payload.serials.join(', ')})`);
      }),
    );

    // El barrido de zonas vencidas apagó la última zona activa: la distribuidora ya no cubre ninguna dirección.
    unsubscribers.push(
      subscribe<NoActiveZonesPayload>(NO_ACTIVE_ZONES_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(NO_ACTIVE_ZONES_EVENT, { at: payload.at });
        void queryClient.invalidateQueries({ queryKey: queryKeys.coverageZones.all });
      }),
    );

    // El reintegro automático falló: se avisa con un toast, queda en la campana (con enlace al pedido) y se refrescan
    // Reintegros y el pedido.
    unsubscribers.push(
      subscribe<RefundFailedPayload>(REFUND_FAILED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(REFUND_FAILED_EVENT, { orderId: payload.orderId, at: payload.at, reason: payload.reason });
        notify.error(
          new Error(
            `No se pudo devolver el pago del pedido ${formatShortId(payload.orderId)}: resolvelo desde Reintegros`,
          ),
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.refunds.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(payload.orderId) });
      }),
    );

    // El cliente modificó el pedido: se avisa con un toast, queda en la campana y se refrescan listados y detalle.
    unsubscribers.push(
      subscribe<OrderUpdatedPayload>(ORDER_UPDATED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(ORDER_UPDATED_EVENT, {
          orderId: payload.orderId,
          totalAmount: payload.totalAmount,
        });
        notify.info(
          `El cliente modificó el pedido ${formatShortId(payload.orderId)}: total ${formatCurrency(payload.totalAmount)}`,
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(payload.orderId) });
      }),
    );

    // Se reintegró un pago: se avisa con un toast, queda en la campana y se refrescan Reintegros y el pedido.
    unsubscribers.push(
      subscribe<PaymentRefundedPayload>(PAYMENT_REFUNDED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(PAYMENT_REFUNDED_EVENT, {
          orderId: payload.orderId,
          totalAmount: payload.amount,
          at: payload.at,
        });
        notify.info(`Se reintegró el pago del pedido ${formatShortId(payload.orderId)}`);
        void queryClient.invalidateQueries({ queryKey: queryKeys.refunds.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(payload.orderId) });
      }),
    );

    // El cliente subió el comprobante de su transferencia: se avisa, queda en la campana y se refrescan el pedido y
    // sus comprobantes (el admin lo ve al lado de confirmar el pago).
    unsubscribers.push(
      subscribe<TransferReceiptUploadedPayload>(TRANSFER_RECEIPT_UPLOADED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(TRANSFER_RECEIPT_UPLOADED_EVENT, { orderId: payload.orderId, at: payload.uploadedAt });
        notify.info(`El cliente subió el comprobante del pedido ${formatShortId(payload.orderId)}`);
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(payload.orderId) });
      }),
    );

    // Un pedido express pasó al reparto común: se avisa con un toast, queda en la campana y se refrescan listados y detalle.
    unsubscribers.push(
      subscribe<ExpressDegradedPayload>(EXPRESS_DEGRADED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        pushNotification(EXPRESS_DEGRADED_EVENT, {
          orderId: payload.orderId,
          totalAmount: payload.total,
          at: new Date().toISOString(),
        });
        notify.info(`El pedido express ${formatShortId(payload.orderId)} pasó al reparto común`);
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(payload.orderId) });
      }),
    );

    // Un cobro impago cambia el pedido, la lista de incidencias y los reportes: se refrescan y se avisa con un toast.
    unsubscribers.push(
      subscribe<IncidentCreatedPayload>(INCIDENT_CREATED_EVENT, (payload) => {
        if (payload.type !== 'unpaid_collection' || !belongsToView(payload)) return;
        pushNotification(INCIDENT_CREATED_EVENT, { orderId: payload.orderId });
        notify.info(`Cobro impago en el pedido ${formatShortId(payload.orderId)}: el chofer no pudo cobrar`);
        void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      }),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, pushNotification, queryClient, belongsToView]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  };

  /** Marca la notificación como leída y, si trajo `orderId`, abre la ficha de ese pedido. */
  const handleNotificationClick = ({ id }: NotificationsDrawerItem) => {
    handleMarkAsRead(id);
    const clicked = notifications.find((notification) => notification.id === id);
    if (clicked?.event === NO_ACTIVE_ZONES_EVENT) {
      setOpen(false);
      navigate('/coverage-zones');
      return;
    }
    const orderId = clicked?.orderId;
    if (orderId) {
      setOpen(false);
      navigate(`/orders/${orderId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Tooltip title={isOnline ? 'Notificaciones' : 'Notificaciones (sin conexión en tiempo real)'} arrow>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unreadCount ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
          className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-outline bg-surface text-ink-2 shadow-control transition-colors hover:bg-surface-hover"
        >
          {isOnline ? (
            <Bell aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          ) : (
            <BellOff aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          )}
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full border-2 border-surface bg-llama-500"
            />
          )}
        </button>
      </Tooltip>

      <NotificationsDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifications.map(toDrawerItem)}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={unreadCount > 0 ? handleMarkAllAsRead : undefined}
      />
    </>
  );
};
