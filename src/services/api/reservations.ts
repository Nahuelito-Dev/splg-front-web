import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type { ConfirmDepositV2Body, Order, Reserva } from './types';

/** GET /orders/reservations: pedidos reservados (RESERVED) de la distribuidora. */
export const listReservations = async (): Promise<Reserva[]> => {
  const { data } = await http.get<Reserva[]>('/orders/reservations');
  return data;
};

/**
 * PATCH /v2/orders/:id/confirm-deposit: confirma la seña recibida en efectivo o por transferencia y la asienta en una
 * caja (efectivo: la elegida en `cashBoxId`; transferencia: la de «Cajas de cobro»). Habilita la activación automática.
 */
export const confirmReservationDeposit = async (
  orderId: string,
  body: ConfirmDepositV2Body,
  key: string,
): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${orderId}/confirm-deposit`, body, {
    baseURL: env.apiUrlV2,
    headers: idempotencyHeaders(key),
  });
  return data;
};
