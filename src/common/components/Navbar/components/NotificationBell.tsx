import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tooltip } from '@mui/material';
import {
  ArrowDownToLine,
  Bell,
  BellOff,
  CircleCheck,
  CircleX,
  MapPinned,
  MapPinOff,
  PackagePlus,
  RotateCcw,
  ThumbsUp,
  Truck,
  UserRoundX,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDistributorEventFilter } from '../../../../hooks/useDistributorEventFilter';
import { useSocketContext } from '../../../../context/useSocketContext';
import {
  ADMIN_NOTIFICATION_EVENT,
  CLAIM_CREATED_EVENT,
  CYLINDER_BLOCKED_EVENT,
  EXPRESS_DEGRADED_EVENT,
  INCIDENT_CREATED_EVENT,
  NO_ACTIVE_ZONES_EVENT,
  ORDER_SOCKET_EVENTS,
  ORDER_UPDATED_EVENT,
  PAYMENT_REFUNDED_EVENT,
  TRANSFER_RECEIPT_UPLOADED_EVENT,
  type TransferReceiptUploadedPayload,
  REFUND_FAILED_EVENT,
  type AdminNotificationPayload,
  type ClaimCreatedPayload,
  type CylinderBlockedPayload,
  type ExpressDegradedPayload,
  type IncidentCreatedPayload,
  type NoActiveZonesPayload,
  type OrderSocketEventName,
  type OrderUpdatedPayload,
  type PaymentRefundedPayload,
  type RefundFailedPayload,
} from '../../../../hooks/useSocket';
import {
  useAdminNotifications,
  useAdminUnreadCount,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from '../../../../services/queries/adminNotifications';
import { queryKeys } from '../../../../services/queries/queryKeys';
import { notificationTarget, notificationVisuals } from '../../../../utils/adminNotifications';
import { notify } from '../../../../utils/notifications';
import { formatCurrency, formatShortId } from '../../../../utils/format';
import { INCIDENT_TYPE, type Tone } from '../../../../utils/statusLabels';
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
  [key: string]: unknown;
}

/**
 * Los avisos en vivo de la sesión, que el back no guarda: el ciclo de vida del pedido y unos pocos eventos sueltos.
 * Los que sí se guardan (reclamos, incidencias, sin choferes, reintegro fallido, comprobante, despacho bloqueado)
 * llegan por la bandeja de la API y no se repiten acá.
 */
type NotificationEvent =
  | OrderSocketEventName
  | typeof NO_ACTIVE_ZONES_EVENT
  | typeof ORDER_UPDATED_EVENT
  | typeof PAYMENT_REFUNDED_EVENT
  | typeof EXPRESS_DEGRADED_EVENT;

interface SessionNotification {
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
  [NO_ACTIVE_ZONES_EVENT]: 'Sin zonas de cobertura activas: no se aceptan pedidos nuevos',
  [ORDER_UPDATED_EVENT]: 'El cliente modificó el pedido',
  [PAYMENT_REFUNDED_EVENT]: 'Se reintegró el pago del pedido',
  [EXPRESS_DEGRADED_EVENT]: 'El pedido express pasó al reparto común',
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
  [NO_ACTIVE_ZONES_EVENT]: { icon: MapPinOff, tone: 'danger' },
  [ORDER_UPDATED_EVENT]: { icon: RotateCcw, tone: 'info' },
  [PAYMENT_REFUNDED_EVENT]: { icon: ArrowDownToLine, tone: 'success' },
  [EXPRESS_DEGRADED_EVENT]: { icon: Truck, tone: 'warn' },
  [ORDER_SOCKET_EVENTS.CREATED]: { icon: PackagePlus, tone: 'primary' },
  [ORDER_SOCKET_EVENTS.ACCEPTED]: { icon: ThumbsUp, tone: 'info' },
  [ORDER_SOCKET_EVENTS.ON_THE_WAY]: { icon: Truck, tone: 'info' },
  [ORDER_SOCKET_EVENTS.DELIVERED]: { icon: CircleCheck, tone: 'success' },
  [ORDER_SOCKET_EVENTS.CANCELLED]: { icon: CircleX, tone: 'danger' },
  [ORDER_SOCKET_EVENTS.RELEASED]: { icon: RotateCcw, tone: 'warn' },
  [ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED]: { icon: UserRoundX, tone: 'warn' },
  [ORDER_SOCKET_EVENTS.ADDRESS_CHANGED]: { icon: MapPinned, tone: 'info' },
};

const MAX_NOTIFICATIONS = 50;
/** Cuántos avisos guardados trae la campana: la primera página; el resto está en /notifications. */
const SAVED_PAGE = { limit: 20, offset: 0 };
const SAVED_PREFIX = 'saved:';

const buildDetail = (event: NotificationEvent, payload: OrderSocketPayload) => {
  const orderRef = payload.orderId ? formatShortId(payload.orderId) : '';
  const extra =
    event === ORDER_SOCKET_EVENTS.CANCELLED && payload.reason
      ? payload.reason
      : event === ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED && payload.driverName
        ? payload.driverName
        : typeof payload.totalAmount === 'number'
          ? formatCurrency(payload.totalAmount)
          : '';
  return [orderRef, extra].filter(Boolean).join(' · ') || undefined;
};

const toDrawerItem = (notification: SessionNotification): NotificationsDrawerItem => ({
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
  const [notifications, setNotifications] = useState<SessionNotification[]>([]);
  const { data: saved, isError: savedError, refetch: refetchSaved } = useAdminNotifications(SAVED_PAGE);
  const { data: unreadSaved, refetch: refetchUnread } = useAdminUnreadCount();
  const markRead = useMarkAdminNotificationRead();
  const markAllRead = useMarkAllAdminNotificationsRead();

  const pushNotification = useCallback((event: NotificationEvent, payload: OrderSocketPayload = {}) => {
    const notification: SessionNotification = {
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

    // Al volver la conexión (corte de red, back reiniciado, sesión renovada) puede haber avisos que llegaron mientras
    // tanto: se vuelve a leer la bandeja.
    unsubscribers.push(
      subscribe('connect', () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.all });
      }),
    );

    // Un aviso nuevo en la bandeja guardada: se refrescan la lista y el contador.
    unsubscribers.push(
      subscribe<AdminNotificationPayload>(ADMIN_NOTIFICATION_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.all });
      }),
    );

    // Un despacho rechazado por vencimiento: el aviso queda guardado en la bandeja; acá sólo el toast.
    unsubscribers.push(
      subscribe<CylinderBlockedPayload>(CYLINDER_BLOCKED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
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

    // El reintegro automático falló: toast y se refrescan Reintegros y el pedido (el aviso queda en la bandeja).
    unsubscribers.push(
      subscribe<RefundFailedPayload>(REFUND_FAILED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
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

    // El cliente subió el comprobante de su transferencia: toast y se refresca el pedido (el aviso queda en la bandeja).
    unsubscribers.push(
      subscribe<TransferReceiptUploadedPayload>(TRANSFER_RECEIPT_UPLOADED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
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

    // Una incidencia nueva refresca su lista. El cobro impago además cambia el pedido y los reportes.
    unsubscribers.push(
      subscribe<IncidentCreatedPayload>(INCIDENT_CREATED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
        if (payload.type === 'unpaid_collection') {
          notify.info(`Cobro impago en el pedido ${formatShortId(payload.orderId)}: el chofer no pudo cobrar`);
          void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
          return;
        }
        const type = INCIDENT_TYPE[payload.type as keyof typeof INCIDENT_TYPE]?.text ?? payload.type;
        notify.info(`Nueva incidencia en el pedido ${formatShortId(payload.orderId)}: ${type}`);
      }),
    );

    // Un reclamo nuevo refresca la lista de reclamos (el aviso queda en la bandeja).
    unsubscribers.push(
      subscribe<ClaimCreatedPayload>(CLAIM_CREATED_EVENT, (payload) => {
        if (!belongsToView(payload)) return;
        notify.info(`Nuevo reclamo en el pedido ${formatShortId(payload.orderId)}: ${payload.reason}`);
        void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
      }),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, pushNotification, queryClient, belongsToView]);

  // Los guardados (primera página) y los de la sesión, mezclados por fecha: lo más nuevo arriba.
  const items = useMemo(() => {
    const savedItems = (saved?.items ?? []).map((n): NotificationsDrawerItem => ({
      id: `${SAVED_PREFIX}${n.id}`,
      title: n.title,
      detail: n.body || undefined,
      createdAt: n.createdAt,
      read: n.readAt !== null,
      ...notificationVisuals(n.kind),
    }));
    return [...savedItems, ...notifications.map(toDrawerItem)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [saved, notifications]);

  const sessionUnread = notifications.filter((n) => !n.read).length;
  const unreadCount = (unreadSaved?.count ?? 0) + sessionUnread;

  const handleMarkAllAsRead = () => {
    markAllRead.mutate();
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  };

  /** Marca el aviso como leído y lo abre: los guardados según su `link`, los de sesión según su pedido. */
  const handleNotificationClick = ({ id }: NotificationsDrawerItem) => {
    if (id.startsWith(SAVED_PREFIX)) {
      const savedId = id.slice(SAVED_PREFIX.length);
      const clicked = saved?.items.find((n) => n.id === savedId);
      if (clicked && clicked.readAt === null) markRead.mutate(savedId);
      const target = notificationTarget(clicked?.link);
      if (target) {
        setOpen(false);
        navigate(target);
      }
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

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
              className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full border-2 border-surface bg-primary"
            />
          )}
        </button>
      </Tooltip>

      <NotificationsDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={items}
        unreadCount={unreadCount}
        onViewAll={handleViewAll}
        loadError={savedError}
        onRetry={() => {
          void refetchSaved();
          void refetchUnread();
        }}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={unreadCount > 0 ? handleMarkAllAsRead : undefined}
      />
    </>
  );
};
