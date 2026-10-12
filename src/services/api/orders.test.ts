import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn<[string, { params: Record<string, unknown> }], Promise<unknown>>(),
  patch: vi.fn(),
}));
vi.mock('./httpClient', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), http }));

import { listOrders, resolveUnpaidOrder } from './orders';

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ data: { orders: [], total: 0 } });
  http.patch.mockReset().mockResolvedValue({ data: { order_id: 'o-1' } });
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
});
