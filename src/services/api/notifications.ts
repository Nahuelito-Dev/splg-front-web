import { http } from './httpClient';
import type { ResultadoDeEnvio, SendOrderConfirmationBody, SendTestNotificationBody, TokensDeUsuario } from './types';

/**
 * POST /notifications/send-test: manda un push real por FCM a un token de
 * dispositivo puntual. No recibe un usuario: hay que pasarle el token de
 * FCM directo (ver `getUserNotificationTokens` para sacárselo a un usuario
 * que ya tenga uno guardado). Nunca lanza: el resultado viene en el cuerpo.
 */
export const sendTestNotification = async (body: SendTestNotificationBody): Promise<ResultadoDeEnvio> => {
  const { data } = await http.post<ResultadoDeEnvio>('/notifications/send-test', body);
  return data;
};

/**
 * GET /notifications/user/:userId: los tokens de FCM que ese usuario tiene
 * guardados (puede no tener ninguno, si nunca abrió la app con push
 * habilitado). Sólo para elegir a quién apuntar la prueba.
 */
export const getUserNotificationTokens = async (userId: string): Promise<TokensDeUsuario> => {
  const { data } = await http.get<TokensDeUsuario>(`/notifications/user/${userId}`);
  return data;
};

/**
 * POST /notifications/order-confirmation (CU-101): reenvía el push de "pedido
 * confirmado". Sólo super_admin. **Ojo con el nombre del campo**: a pesar de
 * llamarse `customerId`, el back busca por `user_id` (`CustomerService.
 * findNotificationToken`, `where: { userId }`), no por `customer_id`; hay
 * que mandar el `user_id` del cliente. Reportado para el back.
 */
export const sendOrderConfirmation = async (body: SendOrderConfirmationBody): Promise<ResultadoDeEnvio> => {
  const { data } = await http.post<ResultadoDeEnvio>('/notifications/order-confirmation', body);
  return data;
};
