import { http } from './httpClient';
import type {
  ChangeEmailBody,
  EmailCambiado,
  Message,
  PruebaDeEmail,
  SendPasswordResetBody,
  TestEmailBody,
} from './types';

/**
 * POST /email/password-reset (CU-047): pública, no necesita sesión. Siempre
 * devuelve el mismo mensaje exista o no la cuenta, para no revelar correos
 * registrados; por eso no exige el token de autenticación (`public`).
 */
export const sendPasswordReset = async (email: string): Promise<Message> => {
  const body: SendPasswordResetBody = { email };
  const { data } = await http.post<Message>('/email/password-reset', body, { public: true });
  return data;
};

/**
 * POST /email/test: manda un correo de prueba real (vía Resend) a la
 * dirección indicada y de paso ejercita el cache de links de reseteo en
 * Redis. El correo tiene que ser el de una cuenta que ya exista en Firebase
 * Auth: si no existe, la API contesta `success: false` (no lanza).
 */
export const testEmailService = async (body: TestEmailBody): Promise<PruebaDeEmail> => {
  const { data } = await http.post<PruebaDeEmail>('/email/test', body);
  return data;
};

/**
 * POST /email/change-email: sólo sirve para que una cuenta cambie SU PROPIO
 * correo, de pie. La API valida el `idToken` de Firebase contra
 * `currentEmail`, así que un administrador no puede cambiarle el correo a
 * otra cuenta desde acá (no tiene su idToken); es la pantalla de "Mi cuenta".
 */
export const changeEmail = async (body: ChangeEmailBody): Promise<EmailCambiado> => {
  const { data } = await http.post<EmailCambiado>('/email/change-email', body);
  return data;
};
