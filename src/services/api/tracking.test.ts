import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLiveFleet } from './tracking';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./httpClient', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  http,
}));

describe('tracking API', () => {
  beforeEach(() => {
    http.get.mockReset();
  });

  it('GET /v2/tracking/vehicles: pide a la v2 y devuelve la respuesta tal cual', async () => {
    const fleet = { generatedAt: '2026-11-21T16:00:00.000Z', vehicles: [] };
    http.get.mockResolvedValue({ data: fleet });
    await expect(getLiveFleet()).resolves.toBe(fleet);
    expect(http.get).toHaveBeenCalledTimes(1);
    const [url, config] = http.get.mock.calls[0] as [string, { baseURL: string }];
    expect(url).toBe('/tracking/vehicles');
    expect(config.baseURL).toMatch(/\/api\/v2$/);
  });

  it('un error del back (403, 400) se propaga: no se asume una lista vacía', async () => {
    const denied = new Error('sin permiso');
    http.get.mockImplementation(() => Promise.reject(denied));
    await expect(getLiveFleet()).rejects.toBe(denied);
  });
});
