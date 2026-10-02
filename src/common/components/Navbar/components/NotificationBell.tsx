import { useCallback, useEffect, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../../../context/useSocketContext';
import { ORDER_SOCKET_EVENTS, type OrderSocketEventName } from '../../../../hooks/useSocket';
import { formatCurrency, formatShortId } from '../../../../utils/format';
import { NotificationsDrawer } from '../../ui/NotificationsDrawer';

/**
 * Payload real de los eventos `order:*` que emite `AdminGateway.notifyAdmins`
 * (`UpdateOrderStatusUseCase`, `CreateOrderUseCase` y `CancelOrderUseCase` en
 * el back): nunca viaja el nombre del cliente ni la dirección, sólo el id del
 * pedido, su estado/monto y, si se canceló, el motivo.
 */
interface OrderSocketPayload {
  orderId?: string;
  totalAmount?: number;
  reason?: string | null;
  /** Sólo en `order:assignment-declined`: el chofer que no confirmó. */
  driverName?: string;
  [key: string]: unknown;
}

export interface OrderNotification {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  /** Con qué pedido navegar al hacer click; `undefined` si el evento no trajo `orderId`. */
  orderId?: string;
}

const EVENT_LABELS: Record<OrderSocketEventName, string> = {
  [ORDER_SOCKET_EVENTS.CREATED]: 'Nuevo pedido',
  [ORDER_SOCKET_EVENTS.ACCEPTED]: 'Pedido aceptado',
  [ORDER_SOCKET_EVENTS.ON_THE_WAY]: 'Pedido en camino',
  [ORDER_SOCKET_EVENTS.DELIVERED]: 'Pedido entregado',
  [ORDER_SOCKET_EVENTS.CANCELLED]: 'Pedido cancelado',
  [ORDER_SOCKET_EVENTS.RELEASED]: 'Pedido liberado, vuelve a buscar chofer',
  [ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED]: 'El chofer no confirmó la asignación',
};

const MAX_NOTIFICATIONS = 50;

const buildMessage = (event: OrderSocketEventName, payload: OrderSocketPayload) => {
  const orderRef = payload.orderId ? ` ${formatShortId(payload.orderId)}` : '';
  const detail =
    event === ORDER_SOCKET_EVENTS.CANCELLED && payload.reason
      ? ` (${payload.reason})`
      : event === ORDER_SOCKET_EVENTS.ASSIGNMENT_DECLINED && payload.driverName
        ? ` (${payload.driverName})`
        : typeof payload.totalAmount === 'number'
          ? ` — ${formatCurrency(payload.totalAmount)}`
          : '';
  return `${EVENT_LABELS[event]}${orderRef}${detail}`.trim();
};

export const NotificationBell = () => {
  const { isOnline, subscribe } = useSocketContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  const pushNotification = useCallback((event: OrderSocketEventName, payload: OrderSocketPayload = {}) => {
    const notification: OrderNotification = {
      id: `${event}-${payload.orderId ?? Date.now()}-${Math.random()}`,
      message: buildMessage(event, payload),
      createdAt: new Date().toISOString(),
      read: false,
      orderId: payload.orderId,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  useEffect(() => {
    const unsubscribers = (Object.values(ORDER_SOCKET_EVENTS) as OrderSocketEventName[]).map((event) =>
      subscribe<OrderSocketPayload>(event, (payload) => pushNotification(event, payload)),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, pushNotification]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  };

  /** Marca la notificación como leída y, si trajo `orderId`, abre la ficha de ese pedido. */
  const handleNotificationClick = (notification: OrderNotification) => {
    handleMarkAsRead(notification.id);
    if (notification.orderId) {
      setOpen(false);
      navigate(`/orders/${notification.orderId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Box>
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
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={unreadCount > 0 ? handleMarkAllAsRead : undefined}
      />
    </Box>
  );
};
