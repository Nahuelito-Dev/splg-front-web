import { env } from '../../config/env';
import { http } from './httpClient';
import type { NotificationLogItem, NotificationLogPage } from './types';

const V3 = { baseURL: env.apiUrlV3 };

export interface NotificationLogFilters {
  channel?: NotificationLogItem['channel'];
  status?: NotificationLogItem['status'];
  type?: string;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  term?: string;
  orderId?: string;
  limit: number;
  offset: number;
}

/** GET /v3/notification-log: los avisos (push y correo) que salieron del sistema, del más nuevo al más viejo. */
export const listNotificationLog = async (filters: NotificationLogFilters): Promise<NotificationLogPage> => {
  const { data } = await http.get<NotificationLogPage>('/notification-log', { ...V3, params: filters });
  return data;
};

/** GET /v3/orders/:id/notifications: los avisos que salieron por un pedido. */
export const listOrderNotifications = async (orderId: string): Promise<NotificationLogItem[]> => {
  const { data } = await http.get<NotificationLogItem[]>(`/orders/${orderId}/notifications`, V3);
  return data;
};
