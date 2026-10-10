import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuditEntry } from '../../../services/api/types';
import { DataAuditDrawer } from './DataAuditDrawer';

afterEach(cleanup);

const ENTRY = {
  auditId: 'a-1',
  actionType: { id: 2, name: 'Modificación' },
  userId: 'u-1',
  user: { userId: 'u-1', fullName: 'Admin Jeny', email: 'admin@splg.com', deleted: false },
  distributorId: 'd-1',
  entity: 'Cylinder',
  recordId: 'c-1',
  ip: '::1',
  dateTime: '2026-10-10T18:53:01.000Z',
  details: [
    { auditDetailId: 'x-1', field: 'state', oldValue: 'in_depot', newValue: 'retired' },
    { auditDetailId: 'x-2', field: 'note', oldValue: null, newValue: '[oculto]' },
  ],
} as AuditEntry;

describe('DataAuditDrawer', () => {
  it('muestra cada campo con su valor anterior y el nuevo', () => {
    render(<DataAuditDrawer entry={ENTRY} onClose={() => undefined} />);
    const row = screen.getByRole('row', { name: /state/ });
    expect(within(row).getByText('in_depot')).toBeInTheDocument();
    expect(within(row).getByText('retired')).toBeInTheDocument();
    expect(screen.getByText('Envase físico', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Admin Jeny')).toBeInTheDocument();
  });

  it('un valor nulo se ve como raya y lo oculto se muestra tal cual', () => {
    render(<DataAuditDrawer entry={ENTRY} onClose={() => undefined} />);
    const row = screen.getByRole('row', { name: /note/ });
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('[oculto]')).toBeInTheDocument();
  });
});
