import { env } from '../../config/env';
import { http } from './httpClient';
import type { AdminNotification, AdminNotificationList, ReadAll, UnreadCount } from './types';

export interface AdminNotificationsParams {
  /** `true`: sólo las sin leer; sin valor: todas. */
  unread?: boolean;
  limit: number;
  offset: number;
}

/** GET /v2/admin-notifications: la bandeja del admin, las más nuevas primero (`readAt` es la lectura de quien pregunta). */
export const listAdminNotifications = async (params: AdminNotificationsParams): Promise<AdminNotificationList> => {
  const { data } = await http.get<AdminNotificationList>('/admin-notifications', {
    baseURL: env.apiUrlV2,
    params: { unread: params.unread || undefined, limit: params.limit, offset: params.offset },
  });
  return data;
};

/** GET /v2/admin-notifications/unread-count: cuántos avisos no leyó quien pregunta. */
export const getAdminUnreadCount = async (): Promise<UnreadCount> => {
  const { data } = await http.get<UnreadCount>('/admin-notifications/unread-count', { baseURL: env.apiUrlV2 });
  return data;
};

/** PATCH /v2/admin-notifications/:id/read: marca un aviso como leído. */
export const markAdminNotificationRead = async (id: string): Promise<AdminNotification> => {
  const { data } = await http.patch<AdminNotification>(
    `/admin-notifications/${id}/read`,
    {},
    { baseURL: env.apiUrlV2 },
  );
  return data;
};

/** PATCH /v2/admin-notifications/read-all: marca todos los avisos como leídos. */
export const markAllAdminNotificationsRead = async (): Promise<ReadAll> => {
  const { data } = await http.patch<ReadAll>('/admin-notifications/read-all', {}, { baseURL: env.apiUrlV2 });
  return data;
};
