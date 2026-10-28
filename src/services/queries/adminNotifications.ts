import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUnreadCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotificationsParams,
} from '../api/adminNotifications';
import { notify } from '../../utils/notifications';
import { queryKeys } from './queryKeys';

const keys = queryKeys.adminNotifications;
const unreadCountKey = [...keys.all, 'unread-count'] as const;

export const useAdminNotifications = (params: AdminNotificationsParams) =>
  useQuery({
    queryKey: keys.list(params),
    queryFn: () => listAdminNotifications(params),
    placeholderData: keepPreviousData,
  });

export const useAdminUnreadCount = () => useQuery({ queryKey: unreadCountKey, queryFn: getAdminUnreadCount });

/** Marcar leído cambia la lista y el contador: se refresca todo lo de la bandeja. */
export const useMarkAdminNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAdminNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    // Sin esto, marcar fallaba en silencio y el aviso seguía sin leer sin explicación.
    onError: (error: Error) => notify.error(error),
  });
};

export const useMarkAllAdminNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAdminNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    // Sin esto, marcar fallaba en silencio y el aviso seguía sin leer sin explicación.
    onError: (error: Error) => notify.error(error),
  });
};
