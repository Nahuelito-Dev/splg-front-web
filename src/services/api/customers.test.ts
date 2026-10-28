import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), http }));

import { listRemovedCustomers, removeCustomerFromDistributor, restoreCustomerInDistributor } from './customers';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('clientes de la distribuidora (API v2)', () => {
  it('la baja es DELETE /customers/:id/distributor en la v2, nunca el borrado global', async () => {
    http.delete.mockResolvedValue({ data: { message: 'ok' } });
    await expect(removeCustomerFromDistributor('c-1')).resolves.toEqual({ message: 'ok' });
    expect(http.delete).toHaveBeenCalledWith('/customers/c-1/distributor', { baseURL: env.apiUrlV2 });
  });

  it('la reactivación es POST /customers/:id/distributor en la v2', async () => {
    http.post.mockResolvedValue({ data: { message: 'ok' } });
    await restoreCustomerInDistributor('c-1');
    expect(http.post).toHaveBeenCalledWith('/customers/c-1/distributor', undefined, { baseURL: env.apiUrlV2 });
  });

  it('los dados de baja se piden a GET /customers/removed en la v2, con la búsqueda como term', async () => {
    http.get.mockResolvedValue({ data: [{ customer_id: 'c-1' }], headers: { 'x-total-count': '1' } });
    const page = await listRemovedCustomers({ page: 0, pageSize: 10 }, 'ana');
    expect(http.get).toHaveBeenCalledWith(
      '/customers/removed',
      expect.objectContaining({ baseURL: env.apiUrlV2, params: expect.objectContaining({ term: 'ana' }) as unknown }),
    );
    expect(page.total).toBe(1);
  });
});
