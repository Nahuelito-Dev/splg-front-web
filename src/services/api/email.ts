import { http } from './httpClient';
import type { PruebaDeEmail, TestEmailBody } from './types';

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
