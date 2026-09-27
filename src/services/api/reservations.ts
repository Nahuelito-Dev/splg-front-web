import { http } from './httpClient';
import type { Order, Reserva } from './types';

/** GET /orders/reservations: pedidos reservados (RESERVED) de la distribuidora. */
export const listReservations = async (): Promise<Reserva[]> => {
  const { data } = await http.get<Reserva[]>('/orders/reservations');
  return data;
};

/** PATCH /orders/:id/confirm-deposit: confirma la seña cobrada en efectivo, habilita la activación automática. */
export const confirmReservationDeposit = async (orderId: string): Promise<Order> => {
  const { data } = await http.patch<Order>(`/orders/${orderId}/confirm-deposit`);
  return data;
};
