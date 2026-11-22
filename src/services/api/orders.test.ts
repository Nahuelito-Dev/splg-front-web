import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn<[string, { params: Record<string, unknown> }], Promise<unknown>>(),
  patch: vi.fn(),
  post: vi.fn(),
}));
vi.mock('./httpClient', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), http }));

import {
  confirmOrderDelivery,
  getOrderDeliveryCode,
  getOrderPaymentState,
  getOrderStatusHistory,
  listOrderPaymentStates,
  listOrders,
  regenerateOrderDeliveryCode,
  releaseFraudHold,
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
    await confirmOrderDelivery('o-1', { reason: 'Cliente confirmó recepción' }, 'confirm-key');

    expect(http.patch).toHaveBeenCalledWith(
      '/orders/o-1/status',
      { status: 'delivered', reason: 'Cliente confirmó recepción' },
      { headers: { 'Idempotency-Key': 'status-key' } },
    );
    expect(http.post).toHaveBeenCalledWith(
      '/orders/o-1/confirm-delivery',
      { reason: 'Cliente confirmó recepción' },
      { baseURL: 'http://localhost:3100/api/v3', headers: { 'Idempotency-Key': 'confirm-key' } },
    );
  });

  it('el código de entrega y su regeneración van por la v3', async () => {
    await getOrderDeliveryCode('o-1');
    await regenerateOrderDeliveryCode('o-1');
    expect(http.get).toHaveBeenCalledWith('/orders/o-1/delivery-code', { baseURL: 'http://localhost:3100/api/v3' });
    expect(http.post).toHaveBeenCalledWith('/orders/o-1/delivery-code/regenerate', undefined, {
      baseURL: 'http://localhost:3100/api/v3',
    });
  });
});

describe('API de pedidos: historial', () => {
  it('lee el historial real de GET /orders/:id/status-history', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'h-1' }] });
    await expect(getOrderStatusHistory('o-1')).resolves.toEqual([{ id: 'h-1' }]);
    expect(http.get.mock.calls[0][0]).toBe('/orders/o-1/status-history');
  });
});

describe('API de pedidos: estado del pago de Mercado Pago (v2)', () => {
  it('el detalle lee /v2/orders/:id/payment', async () => {
    http.get.mockResolvedValue({ data: { orderId: 'o-1', paymentStatus: 'rejected' } });
    const state = await getOrderPaymentState('o-1');
    expect(state.paymentStatus).toBe('rejected');
    expect(http.get).toHaveBeenCalledWith('/orders/o-1/payment', { baseURL: expect.stringMatching(/\/v2$/) as string });
  });

  it('la lista manda los ids separados por coma a /v2/orders/payments', async () => {
    http.get.mockResolvedValue({ data: [] });
    await listOrderPaymentStates(['o-1', 'o-2']);
    const [url, config] = http.get.mock.calls[0] as [string, { baseURL: string; params: { ids: string } }];
    expect(url).toBe('/orders/payments');
    expect(config.baseURL).toMatch(/\/v2$/);
    expect(config.params).toEqual({ ids: 'o-1,o-2' });
  });
});

describe('API de pedidos: liberar la retención por fraude (v2)', () => {
  it('PATCH /v2/orders/:id/payment/fraud-hold/release con el motivo y la clave de idempotencia', async () => {
    await releaseFraudHold('o-1', 'Verifiqué el pago', 'k-1');
    const [url, body, config] = http.patch.mock.calls[0] as [
      string,
      unknown,
      { baseURL: string; headers: Record<string, string> },
    ];
    expect(url).toBe('/orders/o-1/payment/fraud-hold/release');
    expect(body).toEqual({ reason: 'Verifiqué el pago' });
    expect(config.baseURL).toMatch(/\/v2$/);
    expect(config.headers).toEqual({ 'Idempotency-Key': 'k-1' });
  });
});
