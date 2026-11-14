import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', () => ({
  http,
  toQuery: ({ page, pageSize }: { page: number; pageSize: number }) => ({ limit: pageSize, offset: page * pageSize }),
}));

import { env } from '../../config/env';
import {
  endSupportSession,
  getSupportSession,
  listSupportSessionAccesses,
  listSupportSessions,
  supportSessionsQuery,
} from './supportSessions';

const V2 = { baseURL: env.apiUrlV2, skipSupportSession: true };

beforeEach(() => {
  http.get.mockReset();
  http.delete.mockReset().mockResolvedValue({});
});

describe('supportSessionsQuery', () => {
  it('lo vacío no viaja', () => {
    expect(supportSessionsQuery({ status: '', distributorId: '', requestedBy: '', limit: 25, offset: 0 })).toEqual({
      status: undefined,
      distributorId: undefined,
      requestedBy: undefined,
      from: undefined,
      to: undefined,
      limit: 25,
      offset: 0,
    });
  });

  it('los días son argentinos y «hasta» incluye el día entero', () => {
    expect(supportSessionsQuery({ from: '2026-11-01', to: '2026-11-14', limit: 10, offset: 20 })).toMatchObject({
      from: '2026-11-01T00:00:00-03:00',
      to: '2026-11-14T23:59:59.999-03:00',
    });
  });
});

describe('sesiones de soporte de la plataforma', () => {
  it('lista por la v2 con los filtros', async () => {
    http.get.mockResolvedValue({ data: { items: [], total: 0 } });
    await expect(
      listSupportSessions({ status: 'active', distributorId: 'c1', requestedBy: 'u1', limit: 25, offset: 0 }),
    ).resolves.toEqual({ items: [], total: 0 });
    expect(http.get).toHaveBeenCalledWith('/support-sessions', {
      ...V2,
      params: expect.objectContaining({ status: 'active', distributorId: 'c1', requestedBy: 'u1' }) as unknown,
    });
  });

  it('trae la ficha y lo que miró', async () => {
    http.get.mockResolvedValueOnce({ data: { id: 's1' } }).mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await getSupportSession('s1');
    expect(http.get).toHaveBeenCalledWith('/support-sessions/s1', V2);
    await expect(listSupportSessionAccesses('s1', { page: 1, pageSize: 20 })).resolves.toEqual({ rows: [], total: 0 });
    expect(http.get).toHaveBeenLastCalledWith('/support-sessions/s1/accesses', {
      ...V2,
      params: { limit: 20, offset: 20 },
    });
  });

  it('cortar la propia no manda cuerpo; la de otro manda el motivo', async () => {
    await endSupportSession('s1');
    expect(http.delete).toHaveBeenLastCalledWith('/support-sessions/s1', V2);
    await endSupportSession('s2', { reason: 'La empresa pidió cortar el acceso' });
    expect(http.delete).toHaveBeenLastCalledWith('/support-sessions/s2', {
      ...V2,
      data: { reason: 'La empresa pidió cortar el acceso' },
    });
  });
});
