import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import { getProcessSummary, listProcessRuns, processRunsQuery } from './processRuns';

beforeEach(() => http.get.mockReset());

describe('processRunsQuery', () => {
  it('manda los días como instantes argentinos y descarta los filtros vacíos', () => {
    expect(
      processRunsQuery({
        process: 'fleet_alerts',
        status: undefined,
        from: '2026-11-01',
        to: '2026-11-03',
        limit: 25,
        offset: 50,
      }),
    ).toEqual({
      process: 'fleet_alerts',
      status: undefined,
      from: '2026-11-01T00:00:00-03:00',
      to: '2026-11-03T23:59:59.999-03:00',
      limit: 25,
      offset: 50,
    });
    expect(processRunsQuery({ from: '', limit: 10, offset: 0 }).from).toBeUndefined();
  });
});

describe('servicios', () => {
  it('summary pide GET /process-runs/summary en la v2', async () => {
    http.get.mockResolvedValue({ data: { items: [], alerts: 0 } });
    await expect(getProcessSummary()).resolves.toEqual({ items: [], alerts: 0 });
    expect(http.get).toHaveBeenCalledWith('/process-runs/summary', { baseURL: env.apiUrlV2 });
  });

  it('el historial pide GET /process-runs con los filtros', async () => {
    http.get.mockResolvedValue({ data: { items: [], total: 0 } });
    await listProcessRuns({ status: 'failed', limit: 25, offset: 0 });
    expect(http.get).toHaveBeenCalledWith(
      '/process-runs',
      expect.objectContaining({
        baseURL: env.apiUrlV2,
        params: expect.objectContaining({ status: 'failed', limit: 25, offset: 0 }) as unknown,
      }),
    );
  });
});
