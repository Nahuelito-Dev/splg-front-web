import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import {
  getCompanyScheduledTasks,
  getDocumentReadingUsage,
  getPlatformCompany,
  getPlatformOverview,
  getPlatformProcesses,
  listPlatformActivity,
  listPlatformCompanies,
  platformActivityQuery,
  putCompanyScheduledTasks,
  setCompanyOwnedByPlatform,
} from './platformConsole';

const v2 = { baseURL: env.apiUrlV2 };

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ data: 'ok' });
  http.put.mockReset().mockResolvedValue({ data: 'ok' });
});

describe('panel de plataforma: una función por endpoint de la v2', () => {
  it('tablero con período; los extremos vacíos no viajan', async () => {
    await getPlatformOverview({ from: '2026-11-01', to: '' });
    expect(http.get).toHaveBeenCalledWith('/platform/overview', {
      ...v2,
      params: { from: '2026-11-01', to: undefined },
    });
  });

  it('empresas con filtros de estado, propia y paginado', async () => {
    await listPlatformCompanies({ status: 'active', ownedByPlatform: false, limit: 25, offset: 50 });
    expect(http.get).toHaveBeenCalledWith('/platform/companies', {
      ...v2,
      params: { from: undefined, to: undefined, status: 'active', ownedByPlatform: false, limit: 25, offset: 50 },
    });
  });

  it('ficha de una empresa con período', async () => {
    await getPlatformCompany('c1', { from: '2026-10-01', to: '2026-10-31' });
    expect(http.get).toHaveBeenCalledWith('/platform/companies/c1', {
      ...v2,
      params: { from: '2026-10-01', to: '2026-10-31' },
    });
  });

  it('marcar o desmarcar la empresa propia es un PUT con el booleano', async () => {
    await setCompanyOwnedByPlatform('c1', true);
    expect(http.put).toHaveBeenCalledWith('/platform/companies/c1/owned-by-platform', { ownedByPlatform: true }, v2);
  });

  it('tareas programadas de una empresa: GET y PUT de la plataforma', async () => {
    await getCompanyScheduledTasks('c1');
    expect(http.get).toHaveBeenCalledWith('/platform/companies/c1/scheduled-tasks', v2);
    await putCompanyScheduledTasks('c1', { dispatchRetrySeconds: 30 });
    expect(http.put).toHaveBeenCalledWith('/platform/companies/c1/scheduled-tasks', { dispatchRetrySeconds: 30 }, v2);
  });

  it('procesos y uso del lector por mes', async () => {
    await getPlatformProcesses();
    expect(http.get).toHaveBeenCalledWith('/platform/processes', v2);
    await getDocumentReadingUsage('2026-10');
    expect(http.get).toHaveBeenCalledWith('/platform/document-reading-usage', { ...v2, params: { month: '2026-10' } });
  });

  it('actividad: días argentinos como instantes y filtros vacíos fuera', async () => {
    expect(
      platformActivityQuery({ from: '2026-11-01', to: '2026-11-03', actorUserId: '', limit: 25, offset: 0 }),
    ).toEqual({
      from: '2026-11-01T00:00:00-03:00',
      to: '2026-11-03T23:59:59.999-03:00',
      actorUserId: undefined,
      distributorId: undefined,
      limit: 25,
      offset: 0,
    });
    await listPlatformActivity({ distributorId: 'c1', limit: 10, offset: 10 });
    expect(http.get).toHaveBeenCalledWith('/platform/activity', {
      ...v2,
      params: expect.objectContaining({ distributorId: 'c1', limit: 10, offset: 10 }) as unknown,
    });
  });
});
