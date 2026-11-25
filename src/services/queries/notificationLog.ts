import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listNotificationLog, listOrderNotifications, type NotificationLogFilters } from '../api/notificationLog';
import { queryKeys } from './queryKeys';

const keys = queryKeys.notificationLog;

/** Avisos enviados (GET /v3/notification-log), paginado en el servidor. */
export const useNotificationLog = (filters: NotificationLogFilters, enabled = true) =>
  useQuery({
    queryKey: keys.list(filters),
    queryFn: () => listNotificationLog(filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Los avisos que salieron por un pedido (GET /v3/orders/:id/notifications). */
export const useOrderNotifications = (orderId: string | null | undefined) =>
  useQuery({
    queryKey: keys.detail(orderId ?? ''),
    queryFn: () => listOrderNotifications(orderId ?? ''),
    enabled: Boolean(orderId),
  });
