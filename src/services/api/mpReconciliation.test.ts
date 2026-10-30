import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import {
  applyMpReconciliation,
  createMpReconciliation,
  getMpReconciliation,
  getMpReconciliationReport,
  listMpReconciliations,
} from './mpReconciliation';

const v2 = { baseURL: env.apiUrlV2 };

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('API de conciliación con Mercado Pago (v2)', () => {
  it('lista con la página desde 1 y el estado', async () => {
    http.get.mockResolvedValue({ data: { data: [], total: 0 } });
    await listMpReconciliations({ page: 1, pageSize: 10 }, { status: 'ready' });
    expect(http.get).toHaveBeenCalledWith('/mercadopago/reconciliations', {
      ...v2,
      params: { page: 2, limit: 10, status: 'ready' },
    });
  });

  it('lee una corrida por su id', async () => {
    http.get.mockResolvedValue({ data: { reconciliationId: 'r-1', items: [] } });
    await getMpReconciliation('r-1');
    expect(http.get).toHaveBeenCalledWith('/mercadopago/reconciliations/r-1', v2);
  });

  it('pedir la conciliación lleva Idempotency-Key', async () => {
    http.post.mockResolvedValue({ data: { reconciliationId: 'r-1' } });
    const body = { from: '2026-10-01', to: '2026-10-10' };
    await createMpReconciliation(body, 'key-1');
    expect(http.post).toHaveBeenCalledWith('/mercadopago/reconciliations', body, {
      ...v2,
      headers: { 'Idempotency-Key': 'key-1' },
    });
  });

  it('aplicar lleva las diferencias elegidas y Idempotency-Key', async () => {
    http.post.mockResolvedValue({ data: { applied: 1 } });
    const body = { items: [{ itemId: 'i-1' }, { itemId: 'i-2', cashBoxId: 'b-1' }] };
    await applyMpReconciliation('r-1', body, 'key-2');
    expect(http.post).toHaveBeenCalledWith('/mercadopago/reconciliations/r-1/apply', body, {
      ...v2,
      headers: { 'Idempotency-Key': 'key-2' },
    });
  });

  it('pide el enlace firmado del reporte', async () => {
    http.get.mockResolvedValue({ data: { url: 'https://s3/x', expiresAt: null, requiresAuth: false } });
    const link = await getMpReconciliationReport('r-1');
    expect(http.get).toHaveBeenCalledWith('/mercadopago/reconciliations/r-1/report', v2);
    expect(link.url).toBe('https://s3/x');
  });
});
