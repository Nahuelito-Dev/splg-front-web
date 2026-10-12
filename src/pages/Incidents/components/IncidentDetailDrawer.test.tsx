import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '../../../services/api/types';

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canOperate: true, operateHint: undefined }),
}));
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  EntityPhoto: () => null,
  AuditHistoryLink: () => null,
}));
vi.mock('../../../services/queries/incidents', () => ({
  useResolveIncident: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../services/queries/users', () => ({
  useUser: () => ({ data: { full_name: 'Chofer' }, isLoading: false }),
}));
vi.mock('../../Orders/components/details/ResolveUnpaidAction', () => ({
  ResolveUnpaidAction: () => <button type="button">Resolver impago</button>,
}));

import { IncidentDetailDrawer } from './IncidentDetailDrawer';

afterEach(cleanup);

const incident = (type: Incident['type'], paymentStatus: string): Incident =>
  ({
    incident_id: 'i-1',
    order_id: 'o-1',
    type,
    status: 'open',
    description: 'x',
    reported_by: 'u-1',
    createdAt: '2026-10-10T10:00:00Z',
    order: { order_id: 'o-1', totalAmount: 1000, paymentStatus, customer: null },
  }) as unknown as Incident;

const renderDrawer = (i: Incident) =>
  render(<IncidentDetailDrawer open onClose={vi.fn()} incident={i} onEdit={vi.fn()} onDiscard={vi.fn()} />);

describe('IncidentDetailDrawer: cobro impago', () => {
  it('con el pedido impago ofrece «Resolver impago» y no «Marcar como resuelta» ni descartar', () => {
    renderDrawer(incident('unpaid_collection', 'unpaid'));
    expect(screen.getByRole('button', { name: 'Resolver impago' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como resuelta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('una incidencia común sigue con «Marcar como resuelta»', () => {
    renderDrawer(incident('damaged', 'pending'));
    expect(screen.getByRole('button', { name: 'Marcar como resuelta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolver impago' })).toBeNull();
  });

  it('un cobro impago cuyo pedido ya se resolvió permite cerrar la incidencia a mano', () => {
    renderDrawer(incident('unpaid_collection', 'paid'));
    expect(screen.getByRole('button', { name: 'Marcar como resuelta' })).toBeInTheDocument();
  });
});
