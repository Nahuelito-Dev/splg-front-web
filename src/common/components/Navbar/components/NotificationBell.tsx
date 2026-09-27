import { type MouseEvent, useCallback, useEffect, useState } from 'react';
import { Box, Divider, List, ListItemButton, ListItemText, Popover, Tooltip, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../../../context/useSocketContext';
import { ORDER_SOCKET_EVENTS, type OrderSocketEventName } from '../../../../hooks/useSocket';
import { formatCurrency, formatShortId } from '../../../../utils/format';

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
  [key: string]: unknown;
}

interface OrderNotification {
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
};

const MAX_NOTIFICATIONS = 50;

const buildMessage = (event: OrderSocketEventName, payload: OrderSocketPayload) => {
  const orderRef = payload.orderId ? ` ${formatShortId(payload.orderId)}` : '';
  const detail =
    event === ORDER_SOCKET_EVENTS.CANCELLED && payload.reason
      ? ` (${payload.reason})`
      : typeof payload.totalAmount === 'number'
        ? ` — ${formatCurrency(payload.totalAmount)}`
        : '';
  return `${EVENT_LABELS[event]}${orderRef}${detail}`.trim();
};

export const NotificationBell = () => {
  const { isOnline, subscribe } = useSocketContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  /** Marca la notificación como leída y, si trajo `orderId`, abre la ficha de ese pedido. */
  const handleNotificationClick = (notification: OrderNotification) => {
    handleMarkAsRead(notification.id);
    if (notification.orderId) {
      handleClose();
      navigate(`/orders/${notification.orderId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Box>
      <Tooltip title={isOnline ? 'Notificaciones' : 'Notificaciones (sin conexión en tiempo real)'} arrow>
        <button
          type="button"
          onClick={handleOpen}
          aria-label={unreadCount ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
          className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-outline bg-surface text-ink-2 shadow-control transition-colors hover:bg-tinta-50"
        >
          <Bell aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full border-2 border-surface bg-llama-500"
            />
          )}
        </button>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ width: 340 }}>
          <Box sx={{ py: 2, px: 2.5 }}>
            <Typography variant="subtitle1">Notificaciones</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {unreadCount > 0 ? `Tenés ${unreadCount} notificaciones sin leer` : 'No hay notificaciones nuevas'}
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <List disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }} variant="body2">
                Todavía no llegaron pedidos por acá.
              </Typography>
            ) : (
              notifications.map((notification) => (
                <ListItemButton
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1,
                    px: 2,
                    ...(notification.read ? {} : { bgcolor: 'action.selected' }),
                  }}
                >
                  <ListItemText
                    primary={notification.message}
                    secondary={new Date(notification.createdAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Box>
      </Popover>
    </Box>
  );
};
