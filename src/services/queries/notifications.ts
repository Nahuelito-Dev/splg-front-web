import { useMutation, useQuery } from '@tanstack/react-query';
import { getUserNotificationTokens, sendOrderConfirmation, sendTestNotification } from '../api/notifications';
import { queryKeys } from './queryKeys';

/** Sin invalidación: es una prueba puntual, no un listado. */
export const useSendTestNotification = () => useMutation({ mutationFn: sendTestNotification });

/** CU-101: reenvío del push de confirmación de un pedido. */
export const useSendOrderConfirmation = () => useMutation({ mutationFn: sendOrderConfirmation });

/** Tokens de FCM guardados de un usuario, para elegir a cuál mandarle la prueba. */
export const useUserNotificationTokens = (userId: string | undefined) =>
  useQuery({
    queryKey: [...queryKeys.users.detail(userId ?? ''), 'notification-tokens'],
    queryFn: () => getUserNotificationTokens(userId ?? ''),
    enabled: Boolean(userId),
  });
