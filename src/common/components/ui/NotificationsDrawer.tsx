import { Drawer } from '@mui/material';
import { BellRing, X } from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';

interface NotificationsDrawerItem {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: NotificationsDrawerItem[];
  onNotificationClick: (notification: NotificationsDrawerItem) => void;
  /** Sin leídas pendientes, no se muestra la acción. */
  onMarkAllAsRead?: () => void;
}

/**
 * Cajón lateral de notificaciones (inspirado en el patrón "notifications
 * drawer" de Minimal, reescrito con el kit propio): mismos eventos y mismo
 * estado que antes tenía el popover de la campana, en un panel que no tapa
 * el resto de la pantalla.
 */
export const NotificationsDrawer = ({ open, onClose, notifications, onNotificationClick, onMarkAllAsRead }: Props) => (
  <Drawer
    open={open}
    onClose={onClose}
    anchor="right"
    ModalProps={{ keepMounted: true }}
    sx={{ '& .MuiDrawer-paper': { width: 'min(100%, 380px)', border: 0 } }}
  >
    <div className="flex h-full flex-col bg-surface text-ink">
      <div className="flex items-start justify-between gap-3 border-b border-outline px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">Notificaciones</h2>
          <p className="mt-0.5 text-sm text-muted">
            {notifications.some((n) => !n.read)
              ? `Tenés ${notifications.filter((n) => !n.read).length} sin leer`
              : 'No hay notificaciones nuevas'}
          </p>
        </div>
        <IconButton label="Cerrar notificaciones" icon={<X />} onClick={onClose} />
      </div>

      {onMarkAllAsRead && (
        <div className="border-b border-outline-soft px-5 py-2.5">
          <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
            Marcar todas como leídas
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="Todavía no llegaron pedidos por acá"
            description="Las novedades de pedidos en tiempo real van a aparecer en esta lista."
          />
        ) : (
          <ul className="divide-y divide-outline-soft">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className="flex w-full flex-col gap-0.5 px-5 py-3 text-left transition-colors hover:bg-surface-hover"
                >
                  <span className={notification.read ? 'text-sm text-ink-2' : 'text-sm font-semibold text-ink'}>
                    {notification.message}
                  </span>
                  <span className="text-xs text-faint">
                    {new Date(notification.createdAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </Drawer>
);
