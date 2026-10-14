import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn<[string, { params: Record<string, unknown> }], Promise<unknown>>(),
  patch: vi.fn(),
  post: vi.fn(),
}));
vi.mock('./httpClient', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), http }));

import {
  confirmOrderDelivery,
  getOrderStatusHistory,
  listOrders,
  resolveUnpaidOrder,
  updateOrderStatus,
} from './orders';

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ data: { orders: [], total: 0 } });
  http.patch.mockReset().mockResolvedValue({ data: { order_id: 'o-1' } });
  http.post.mockReset().mockResolvedValue({ data: { order_id: 'o-1' } });
});

describe('API de pedidos: cobros', () => {
  it('el listado manda paymentStatus', async () => {
    await listOrders({ page: 0, pageSize: 10 }, { paymentStatus: 'unpaid' });
    expect(http.get.mock.calls[0][1].params).toMatchObject({ paymentStatus: 'unpaid' });
  });

  it('resolve-unpaid va por PATCH con el cuerpo y la Idempotency-Key', async () => {
    await resolveUnpaidOrder('o-1', { resolution: 'written_off', note: 'Perdido' }, 'key-1');
    expect(http.patch).toHaveBeenCalledWith(
      '/orders/o-1/payment/resolve-unpaid',
      { resolution: 'written_off', note: 'Perdido' },
      { headers: { 'Idempotency-Key': 'key-1' } },
    );
  });

  it('las entregas manuales viajan con motivo y clave de idempotencia', async () => {
    await updateOrderStatus('o-1', { status: 'delivered', reason: 'Cliente confirmó recepción' }, 'status-key');
    await confirmOrderDelivery('o-1', { code: 'A1B2C3', reason: 'Cliente confirmó recepción' }, 'confirm-key');

    expect(http.patch).toHaveBeenCalledWith(
      '/orders/o-1/status',
      { status: 'delivered', reason: 'Cliente confirmó recepción' },
      { headers: { 'Idempotency-Key': 'status-key' } },
    );
    expect(http.post).toHaveBeenCalledWith(
      '/orders/o-1/confirm-delivery',
      { code: 'A1B2C3', reason: 'Cliente confirmó recepción' },
      { headers: { 'Idempotency-Key': 'confirm-key' } },
    );
  });
});

describe('API de pedidos: historial', () => {
  it('lee el historial real de GET /orders/:id/status-history', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'h-1' }] });
    await expect(getOrderStatusHistory('o-1')).resolves.toEqual([{ id: 'h-1' }]);
    expect(http.get.mock.calls[0][0]).toBe('/orders/o-1/status-history');
  });
});
