import { env } from '../../config/env';
import { http } from './httpClient';
import type { MercadoPagoCredentials, SaveMercadoPagoCredentialsBody } from './types';

const PATH = '/distributor/mercadopago-credentials';

/** GET /v2/distributor/mercadopago-credentials: con qué cuenta cobra la distribuidora (valores enmascarados). */
export const getMercadoPagoCredentials = async (): Promise<MercadoPagoCredentials> => {
  const { data } = await http.get<MercadoPagoCredentials>(PATH, { baseURL: env.apiUrlV2 });
  return data;
};

/** PUT /v2/distributor/mercadopago-credentials: verifica el token contra Mercado Pago y guarda la cuenta propia. */
export const putMercadoPagoCredentials = async (
  body: SaveMercadoPagoCredentialsBody,
): Promise<MercadoPagoCredentials> => {
  const { data } = await http.put<MercadoPagoCredentials>(PATH, body, { baseURL: env.apiUrlV2 });
  return data;
};

/** PUT /v2/distributor/mercadopago-credentials/deactivate: baja lógica; vuelve la cuenta del sistema. */
export const deactivateMercadoPagoCredentials = async (): Promise<MercadoPagoCredentials> => {
  const { data } = await http.put<MercadoPagoCredentials>(`${PATH}/deactivate`, undefined, { baseURL: env.apiUrlV2 });
  return data;
};
