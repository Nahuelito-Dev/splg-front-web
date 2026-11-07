import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';

import type {
  CreateContainerAdjustmentBody,
  CustomerContainer,
  CustomerContainerMovement as MovimientoGenerado,
  CustomerContainerMovements,
  CustomerContainers as CuentaGenerada,
} from './types';

/** Cuántos envases de un tipo tiene el cliente (`loanedByM5`: prestados por el recupero, sólo informativo). */
export type CustomerContainerAccount = CustomerContainer;
export type CustomerContainers = CuentaGenerada;
/** Por qué cambió la cuenta de envases. */
export type CustomerContainerReason = MovimientoGenerado['reason'];
/** `quantity` con signo: positivo suma envases, negativo los resta. */
export type CustomerContainerMovement = MovimientoGenerado;
export type CustomerContainerMovementPage = CustomerContainerMovements;
export type AdjustCustomerContainersBody = CreateContainerAdjustmentBody;

const v2 = { baseURL: env.apiUrlV2 };

/** GET /v2/customers/:id/containers: los envases del cliente por tipo (`:id` es el id de la ficha, no el `user_id`). */
export const getCustomerContainers = async (customerId: string): Promise<CustomerContainers> => {
  const { data } = await http.get<CustomerContainers>(`/customers/${customerId}/containers`, v2);
  return data;
};

/** GET /v2/customers/:id/containers/movements: el historial de la cuenta de envases, más nuevos primero. */
export const listCustomerContainerMovements = async (
  customerId: string,
  { page, pageSize }: { page: number; pageSize: number },
): Promise<CustomerContainerMovementPage> => {
  const { data } = await http.get<CustomerContainerMovementPage>(`/customers/${customerId}/containers/movements`, {
    ...v2,
    params: { limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/**
 * POST /v2/customers/:id/containers/adjustments: suma o resta envases propios de un tipo, con nota obligatoria.
 * Devuelve la cuenta de ese tipo ya ajustada; 409 si el cliente quedaría con envases negativos.
 */
export const adjustCustomerContainers = async (
  customerId: string,
  body: AdjustCustomerContainersBody,
  key: string,
): Promise<CustomerContainerAccount> => {
  const { data } = await http.post<CustomerContainerAccount>(`/customers/${customerId}/containers/adjustments`, body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};
