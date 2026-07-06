import { MouseEvent, useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useSocketContext } from '../../../../context/SocketContext';
import {
  ORDER_SOCKET_EVENTS,
  OrderSocketEventName,
} from '../../../../hooks/useSocket';

// TODO(backend): ajustar esta interfaz al payload real que emita el gateway
// de pedidos (por ahora asumimos algo mínimo: id, cliente y dirección).
interface OrderSocketPayload {
  orderId?: string;
  customerName?: string;
  address?: string;
  [key: string]: unknown;
}

interface OrderNotification {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const EVENT_LABELS: Record<OrderSocketEventName, string> = {
  [ORDER_SOCKET_EVENTS.CREATED]: 'Nuevo pedido',
  [ORDER_SOCKET_EVENTS.ACCEPTED]: 'Pedido aceptado',
  [ORDER_SOCKET_EVENTS.ON_THE_WAY]: 'Pedido en camino',
  [ORDER_SOCKET_EVENTS.DELIVERED]: 'Pedido entregado',
  [ORDER_SOCKET_EVENTS.CANCELLED]: 'Pedido cancelado',
};

const MAX_NOTIFICATIONS = 50;

const buildMessage = (
  event: OrderSocketEventName,
  payload: OrderSocketPayload,
) => {
  const orderRef = payload.orderId ? ` #${payload.orderId.slice(0, 8)}` : '';
  const customer = payload.customerName ? ` de ${payload.customerName}` : '';
  return `${EVENT_LABELS[event]}${orderRef}${customer}`.trim();
};

export const NotificationBell = () => {
  const { isOnline, subscribe } = useSocketContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  const pushNotification = useCallback(
    (event: OrderSocketEventName, payload: OrderSocketPayload = {}) => {
      const notification: OrderNotification = {
        id: `${event}-${payload.orderId ?? Date.now()}-${Math.random()}`,
        message: buildMessage(event, payload),
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) =>
        [notification, ...prev].slice(0, MAX_NOTIFICATIONS),
      );
    },
    [],
  );

  useEffect(() => {
    const unsubscribers = (
      Object.values(ORDER_SOCKET_EVENTS) as OrderSocketEventName[]
    ).map((event) =>
      subscribe<OrderSocketPayload>(event, (payload) =>
        pushNotification(event, payload),
      ),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, pushNotification]);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Box>
      <Tooltip
        title={
          isOnline
            ? 'Notificaciones'
            : 'Notificaciones (sin conexión en tiempo real)'
        }
        arrow
      >
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ color: 'white' }} />
          </Badge>
        </IconButton>
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
              {unreadCount > 0
                ? `Tenés ${unreadCount} notificaciones sin leer`
                : 'No hay notificaciones nuevas'}
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
                  onClick={() => handleMarkAsRead(notification.id)}
                  sx={{
                    py: 1,
                    px: 2,
                    ...(notification.read ? {} : { bgcolor: 'action.selected' }),
                  }}
                >
                  <ListItemText
                    primary={notification.message}
                    secondary={new Date(notification.createdAt).toLocaleTimeString(
                      'es-AR',
                      { hour: '2-digit', minute: '2-digit' },
                    )}
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
