import { http } from './httpClient';
import { idempotencyHeaders, newIdempotencyKey } from './idempotency';
import type { Refund, RefundList } from './types';

export interface RefundFilters {
  status?: Refund['status'];
}

/** GET /refunds: devoluciones de la distribuidora, las más nuevas primero (`failed` = esperan un reintento). */
export const listRefunds = async (
  params: { page: number; pageSize: number },
  filters: RefundFilters = {},
): Promise<RefundList> => {
  const { data } = await http.get<RefundList>('/refunds', {
    params: { limit: params.pageSize, offset: params.page * params.pageSize, status: filters.status },
  });
  return data;
};

/** GET /orders/:id/refunds: las devoluciones de un pedido. */
export const listOrderRefunds = async (orderId: string): Promise<Refund[]> => {
  const { data } = await http.get<Refund[]>(`/orders/${orderId}/refunds`);
  return data;
};

/**
 * POST /orders/:id/refunds/retry: repite lo que falló con la misma clave de idempotencia (no devuelve dos veces).
 * 409 si el pedido no está cancelado ni tiene pendiente la devolución del recargo express.
 */
export const retryOrderRefunds = async (orderId: string): Promise<Refund[]> => {
  const { data } = await http.post<Refund[]>(`/orders/${orderId}/refunds/retry`, undefined, {
    headers: idempotencyHeaders(newIdempotencyKey()),
  });
  return data;
};
