import { afterEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn<unknown[], Promise<unknown>>(),
  post: vi.fn<unknown[], Promise<unknown>>(),
  patch: vi.fn<unknown[], Promise<unknown>>(),
  delete: vi.fn<unknown[], Promise<unknown>>(),
}));
const V2 = { baseURL: expect.stringMatching(/\/v2$/) as unknown };
vi.mock('./httpClient', () => ({ http }));

import { createWarehouse, deleteWarehouse, getWarehouse, listWarehouses, updateWarehouse } from './stock';

afterEach(() => {
  vi.clearAllMocks();
});

describe('galpones (API v2, con ubicación)', () => {
  it('la lista y la ficha se leen de /v2/warehouses', async () => {
    http.get.mockResolvedValue({ data: [] });
    await listWarehouses(true);
    expect(http.get).toHaveBeenCalledWith('/warehouses', { params: { includeInactive: true }, ...V2 });
    await getWarehouse('w-1');
    expect(http.get).toHaveBeenLastCalledWith('/warehouses/w-1', V2);
  });

  it('el alta y la edición van a /v2/warehouses con las coordenadas', async () => {
    http.post.mockResolvedValue({ data: {} });
    http.patch.mockResolvedValue({ data: {} });
    const body = { name: 'Central', code: 'CEN', kind: 'depot' as const, latitude: -27.3671, longitude: -55.8961 };
    await createWarehouse(body);
    expect(http.post).toHaveBeenCalledWith('/warehouses', body, V2);
    await updateWarehouse('w-1', { latitude: null, longitude: null });
    expect(http.patch).toHaveBeenCalledWith('/warehouses/w-1', { latitude: null, longitude: null }, V2);
  });

  it('la baja sigue en la v1 (la v2 no la tiene)', async () => {
    http.delete.mockResolvedValue({ data: {} });
    await deleteWarehouse('w-1');
    expect(http.delete).toHaveBeenCalledWith('/warehouses/w-1');
  });
});
