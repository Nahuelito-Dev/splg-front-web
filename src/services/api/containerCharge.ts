import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';

import type { ContainerChargeConfig as Generado, ContainerChargeConfigBody } from './types';

/** Cobro de envases de la distribuidora: apagado (canje 1 a 1) por omisión. */
export type ContainerChargeConfig = Generado;
/** Cuerpo del PUT: el interruptor completo. */
export type ContainerChargeBody = ContainerChargeConfigBody;

/** GET /v2/container-charge: si los pedidos cobran los envases que le faltan al cliente. */
export const getContainerCharge = async (): Promise<ContainerChargeConfig> => {
  const { data } = await http.get<ContainerChargeConfig>('/container-charge', { baseURL: env.apiUrlV2 });
  return data;
};

/** PUT /v2/container-charge (admin y superadmin), con `Idempotency-Key`: un reintento con la misma clave no repite. */
export const putContainerCharge = async (
  body: ContainerChargeBody,
  idempotencyKey: string,
): Promise<ContainerChargeConfig> => {
  const { data } = await http.put<ContainerChargeConfig>('/container-charge', body, {
    baseURL: env.apiUrlV2,
    headers: idempotencyHeaders(idempotencyKey),
  });
  return data;
};
