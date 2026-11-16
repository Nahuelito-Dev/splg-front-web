import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuditEntryV2 } from '../../../services/api/types';
import { DataAuditTable } from './DataAuditTable';

afterEach(cleanup);

const row = (patch: Partial<AuditEntryV2>) =>
  ({
    auditId: 'a-1',
    actionType: { id: 6, name: 'Ingreso' },
    userId: null,
    user: null,
    entity: 'Sesion',
    recordId: 'ana@splg.com',
    dateTime: '2026-10-10T18:53:01.000Z',
    details: [],
    origin: 'system',
    source: 'app',
    ...patch,
  }) as AuditEntryV2;

const renderTable = (rows: AuditEntryV2[]) =>
  render(
    <DataAuditTable
      rows={rows}
      total={rows.length}
      loading={false}
      filtered={false}
      pagination={{ page: 0, pageSize: 25 }}
      onPaginationChange={() => undefined}
      onView={() => undefined}
    />,
  );

describe('DataAuditTable', () => {
  it('en una sesión el registro es el email entero, no un id corto', () => {
    renderTable([row({})]);
    expect(screen.getByText('ana@splg.com')).toBeInTheDocument();
  });
});
