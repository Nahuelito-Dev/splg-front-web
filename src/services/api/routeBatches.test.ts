import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dissolveRouteBatch,
  getRouteBatch,
  getRouteBatchSettings,
  listRouteBatches,
  patchRouteBatchSettings,
  runRouteBatches,
} from './routeBatches';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock('./httpClient', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, http };
});

const V2 = expect.objectContaining({ baseURL: expect.stringContaining('/v2') as string }) as unknown;

describe('API de recorridos (v2)', () => {
  beforeEach(() => {
    http.get.mockReset().mockResolvedValue({ data: {} });
    http.post.mockReset().mockResolvedValue({ data: {} });
    http.patch.mockReset().mockResolvedValue({ data: {} });
  });

  it('lista los lotes con el filtro y la página pedidos', async () => {
    await listRouteBatches({ page: 2, pageSize: 10 }, { status: 'offered' });
    expect(http.get).toHaveBeenCalledWith(
      '/route-batches',
      expect.objectContaining({ params: { status: 'offered', limit: 10, offset: 20 } }),
    );
    expect((http.get.mock.calls[0] as unknown[])[1]).toEqual(V2);
  });

  it('pide un lote por id', async () => {
    await getRouteBatch('b-1');
    expect(http.get).toHaveBeenCalledWith('/route-batches/b-1', V2);
  });

  it('arma lotes ahora y deshace uno por POST', async () => {
    await runRouteBatches();
    await dissolveRouteBatch('b-1');
    expect(http.post).toHaveBeenNthCalledWith(1, '/route-batches/run', undefined, V2);
    expect(http.post).toHaveBeenNthCalledWith(2, '/route-batches/b-1/dissolve', undefined, V2);
  });

  it('lee y cambia los parámetros', async () => {
    await getRouteBatchSettings();
    await patchRouteBatchSettings({ groupingRadiusKm: 5 });
    expect(http.get).toHaveBeenCalledWith('/route-batches/settings', V2);
    expect(http.patch).toHaveBeenCalledWith('/route-batches/settings', { groupingRadiusKm: 5 }, V2);
  });
});
