import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type { FailedVisit, FailedVisitOrdersPage, RevisitChoiceBody, RevisitDay, RevisitState } from './types';

const V3 = { baseURL: env.apiUrlV3 };

/** Estado de la nueva visita por el que se filtra el listado (`open`: todo lo que sigue pendiente). */
export type FailedVisitStatusFilter = 'open' | 'awaiting_admin' | 'proposed' | 'confirmed' | 'all';

export interface FailedVisitFilters {
  status: FailedVisitStatusFilter;
  reason?: FailedVisit['reason'];
  from?: string;
  to?: string;
  term?: string;
  limit: number;
  offset: number;
}

/** GET /v3/failed-visits: un renglón por pedido con visitas fallidas (primero los que esperan la decisión del admin). */
export const listFailedVisitOrders = async (filters: FailedVisitFilters): Promise<FailedVisitOrdersPage> => {
  const { data } = await http.get<FailedVisitOrdersPage>('/failed-visits', { ...V3, params: filters });
  return data;
};

/** GET /v3/orders/:id/failed-visits: el historial de visitas fallidas del pedido, de la más nueva a la más vieja. */
export const listOrderFailedVisits = async (orderId: string): Promise<FailedVisit[]> => {
  const { data } = await http.get<FailedVisit[]>(`/orders/${orderId}/failed-visits`, V3);
  return data;
};

/** GET /v3/orders/:id/revisit/options: los días hábiles con franjas libres para la nueva visita. */
export const listRevisitOptions = async (orderId: string): Promise<RevisitDay[]> => {
  const { data } = await http.get<RevisitDay[]>(`/orders/${orderId}/revisit/options`, V3);
  return data;
};

/** POST /v3/orders/:id/revisit/schedule: el admin fija el día y la franja de la nueva visita. */
export const scheduleRevisit = async (
  orderId: string,
  body: RevisitChoiceBody,
  idempotencyKey: string,
): Promise<RevisitState> => {
  const { data } = await http.post<RevisitState>(`/orders/${orderId}/revisit/schedule`, body, {
    ...V3,
    headers: idempotencyHeaders(idempotencyKey),
  });
  return data;
};
