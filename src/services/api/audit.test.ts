import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import { auditEntriesQuery, buildAuditQuery, getAuditEntry, listAuditActionTypes, listAuditEntries } from './audit';

beforeEach(() => http.get.mockReset());

describe('buildAuditQuery', () => {
  it('saca los filtros vacíos y deja limit/offset', () => {
    expect(buildAuditQuery({ limit: 10, offset: 0, resource: '', actorUserId: undefined })).toEqual({
      limit: 10,
      offset: 0,
    });
  });

  it('manda los filtros con valor', () => {
    expect(buildAuditQuery({ limit: 25, offset: 25, resource: 'orders', result: 'failure' })).toEqual({
      resource: 'orders',
      result: 'failure',
      limit: 25,
      offset: 25,
    });
  });
});

describe('auditoría de datos por la v2', () => {
  it('lista las entradas por la v2 con el filtro de origen', async () => {
    http.get.mockResolvedValue({ data: { data: [{ auditId: 'a-1' }], total: 1 } });
    const page = await listAuditEntries({ origin: 'direct', entity: '', page: 2, limit: 25 });
    expect(page).toEqual({ rows: [{ auditId: 'a-1' }], total: 1 });
    expect(http.get).toHaveBeenCalledWith('/audit/entries', {
      baseURL: env.apiUrlV2,
      params: { origin: 'direct', page: 2, limit: 25 },
    });
  });

  it('pide el detalle y el catálogo de acciones a la v2', async () => {
    http.get.mockResolvedValue({ data: [] });
    await getAuditEntry('a-1');
    expect(http.get).toHaveBeenCalledWith('/audit/entries/a-1', { baseURL: env.apiUrlV2 });
    await listAuditActionTypes();
    expect(http.get).toHaveBeenCalledWith('/audit/action-types', { baseURL: env.apiUrlV2 });
  });

  it('el exporte lleva el origen y no la paginación', () => {
    expect(auditEntriesQuery({ origin: 'system', entity: '', page: 1, limit: 10 })).toEqual({ origin: 'system' });
  });
});
