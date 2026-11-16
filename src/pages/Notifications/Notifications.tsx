import { BellRing, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageContainer,
  PageHeader,
  Skeleton,
  Tabs,
  cx,
  tabPanelProps,
  type TabItem,
} from '../../common/components/ui';
import { TONE_CLASSES } from '../../common/components/ui/toneClasses';
import { useClampPage, useUrlPagedParams } from '../../hooks';
import type { AdminNotification } from '../../services/api/types';
import {
  useAdminNotifications,
  useAdminUnreadCount,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from '../../services/queries/adminNotifications';
import { notificationTarget, notificationVisuals } from '../../utils/adminNotifications';
import { formatDateTime } from '../../utils/format';

const TABS_ID = 'notifications-page';
const PAGE_SIZE = 25;

type TabId = 'all' | 'unread';

/** La bandeja completa de avisos del admin: todos o sólo los sin leer, paginada contra la API. */
export const Notifications = () => {
  const navigate = useNavigate();
  const [{ tab: tabParam }, setFilters, pagination, setPagination] = useUrlPagedParams({ tab: 'all' }, PAGE_SIZE);
  const tab: TabId = tabParam === 'unread' ? 'unread' : 'all';
  const { data, isPending, error, refetch } = useAdminNotifications({
    unread: tab === 'unread',
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });
  const { data: unread } = useAdminUnreadCount();
  const markRead = useMarkAdminNotificationRead();
  const markAllRead = useMarkAllAdminNotificationsRead();
  useClampPage(pagination, data?.total, setPagination);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
  const unreadTotal = unread?.count ?? 0;

  const tabs: TabItem[] = [
    { id: 'all', label: 'Todas' },
    { id: 'unread', label: 'Sin leer', count: unread ? unreadTotal : null, tone: 'primary' },
  ];

  const open = (notification: AdminNotification) => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    const target = notificationTarget(notification.link);
    if (target) navigate(target);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Notificaciones"
        description="Los avisos que el sistema guarda para vos: reclamos, incidencias, reintegros y más."
        actions={
          <Button
            variant="secondary"
            icon={<CheckCheck />}
            loading={markAllRead.isPending}
            disabled={unreadTotal === 0}
            onClick={() => markAllRead.mutate()}
          >
            Marcar todas como leídas
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <Tabs
          label="Filtrar notificaciones"
          idPrefix={TABS_ID}
          value={tab}
          onChange={(id) => setFilters({ tab: id })}
          items={tabs}
        />
        <div {...tabPanelProps(TABS_ID, tab)}>
          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isPending ? (
            <div role="status" aria-label="Cargando notificaciones" className="space-y-4 p-5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title={tab === 'unread' ? 'Estás al día' : 'Todavía no hay notificaciones'}
              description={
                tab === 'unread'
                  ? 'No tenés notificaciones sin leer.'
                  : 'Los avisos que el sistema guarde van a aparecer en esta lista.'
              }
            />
          ) : (
            <ul className="divide-y divide-outline-soft">
              {items.map((notification) => {
                const { icon: Icon, tone } = notificationVisuals(notification.kind);
                const read = notification.readAt !== null;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => open(notification)}
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                    >
                      <span
                        aria-hidden="true"
                        className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', TONE_CLASSES[tone])}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">
                        <span className={cx('block text-sm', read ? 'text-ink-2' : 'font-semibold text-ink')}>
                          {notification.title}
                        </span>
                        {notification.body && <span className="block text-[13px] text-muted">{notification.body}</span>}
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatDateTime(notification.createdAt)} · {read ? 'Leída' : 'Sin leer'}
                        </span>
                      </span>
                      {!read && (
                        <span
                          role="img"
                          aria-label="Sin leer"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {!error && total > pagination.pageSize && (
          <div className="flex items-center justify-between gap-3 border-t border-outline px-5 py-3">
            <span className="text-xs text-muted">
              Página {pagination.page + 1} de {lastPage + 1} · {total} avisos
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page === 0}
                onClick={() => setPagination({ page: pagination.page - 1 })}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= lastPage}
                onClick={() => setPagination({ page: pagination.page + 1 })}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
};
