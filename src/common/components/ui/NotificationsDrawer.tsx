import { useState } from 'react';
import { Drawer } from '@mui/material';
import { BellRing, CheckCheck, X, type LucideIcon } from 'lucide-react';
import { formatElapsed } from '../../../utils/format';
import type { Tone } from '../../../utils/statusLabels';
import { Button } from './Button';
import { cx } from './cx';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';
import { Tabs } from './Tabs';
import { tabPanelProps } from './tabIds';
import { TONE_CLASSES } from './toneClasses';

export interface NotificationsDrawerItem {
  id: string;
  title: string;
  detail?: string;
  createdAt: string;
  read: boolean;
  /** Ícono del tipo de aviso, sobre un círculo del color de `tone`. */
  icon: LucideIcon;
  tone: Tone;
}

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: NotificationsDrawerItem[];
  onNotificationClick: (notification: NotificationsDrawerItem) => void;
  /** Sin leídas pendientes, no se muestra la acción. */
  onMarkAllAsRead?: () => void;
}

type TabId = 'all' | 'unread';

/**
 * Cajón lateral de notificaciones (modelo `notifications-drawer` de Minimal,
 * reescrito con el kit): pestañas Todas / Sin leer con contador, ícono por
 * tipo, hora relativa y marcar todas como leídas, en un panel que no tapa el resto de la pantalla.
 */
export const NotificationsDrawer = ({ open, onClose, notifications, onNotificationClick, onMarkAllAsRead }: Props) => {
  const [tab, setTab] = useState<TabId>('all');
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const now = Date.now();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: 'min(100%, 400px)', border: 0 } }}
    >
      <div className="flex h-full flex-col bg-surface text-ink">
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">Notificaciones</h2>
            <p className="mt-0.5 text-sm text-muted">
              {unreadCount > 0 ? `Tenés ${unreadCount} sin leer` : 'No hay notificaciones nuevas'}
            </p>
          </div>
          <IconButton label="Cerrar notificaciones" icon={<X />} onClick={onClose} />
        </div>

        <Tabs
          label="Filtrar notificaciones"
          idPrefix="notifications"
          value={tab}
          onChange={(id) => setTab(id as TabId)}
          items={[
            { id: 'all', label: 'Todas', count: notifications.length },
            { id: 'unread', label: 'Sin leer', count: unreadCount, tone: 'primary' },
          ]}
        />

        <div {...tabPanelProps('notifications', tab)} className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title={tab === 'unread' ? 'Estás al día' : 'Todavía no llegaron pedidos por acá'}
              description={
                tab === 'unread'
                  ? 'No tenés notificaciones sin leer.'
                  : 'Las novedades de pedidos en tiempo real van a aparecer en esta lista.'
              }
            />
          ) : (
            <ul className="divide-y divide-outline-soft">
              {visible.map((notification) => {
                const Icon = notification.icon;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => onNotificationClick(notification)}
                      className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                          TONE_CLASSES[notification.tone],
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">
                        <span
                          className={cx('block text-sm', notification.read ? 'text-ink-2' : 'font-semibold text-ink')}
                        >
                          {notification.title}
                        </span>
                        {notification.detail && (
                          <span className="block text-[13px] text-muted">{notification.detail}</span>
                        )}
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatElapsed(notification.createdAt, now)}
                        </span>
                      </span>
                      {!notification.read && (
                        <span
                          role="img"
                          aria-label="Sin leer"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-llama-500"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {onMarkAllAsRead && (
          <div className="border-t border-outline px-5 py-3">
            <Button variant="secondary" size="sm" icon={<CheckCheck />} onClick={onMarkAllAsRead} className="w-full">
              Marcar todas como leídas
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
};
