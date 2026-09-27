import { describe, expect, it } from 'vitest';
import { buildAuditQuery } from './audit';

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
