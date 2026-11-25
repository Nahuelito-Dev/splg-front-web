import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVehicleUtilization } from './reports';

const get = vi.hoisted(() => vi.fn());
vi.mock('./httpClient', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  http: { get },
}));

describe('reportes v3', () => {
  beforeEach(() => get.mockReset());

  it('pide la utilización por vehículo a la versión 3 con el rango', async () => {
    get.mockResolvedValue({ data: { rows: [], totals: {} } });
    await getVehicleUtilization({ from: '2026-10-01', to: '2026-10-31' });
    expect(get).toHaveBeenCalledWith('/reports/vehicle-utilization', {
      baseURL: expect.stringMatching(/\/v3$/) as unknown,
      params: { from: '2026-10-01', to: '2026-10-31' },
    });
  });
});
