import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cylinder } from '../../../services/api/types';

const list = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/physicalCylinders', () => ({ useCylinders: () => list() as unknown }));

import { CylinderLinksCard } from './CylinderLinksCard';

afterEach(cleanup);

const cyl = (id: string, serial: string, lastMovementAt: string | null): Cylinder =>
  ({
    cylinder_id: id,
    serial,
    state: 'dispatched',
    gas_cylinder: { type: 'Garrafa 10kg', weight: 10 },
    lastMovementAt,
  }) as unknown as Cylinder;

const renderCard = () =>
  render(
    <MemoryRouter>
      <CylinderLinksCard
        title="Envases"
        filters={{ orderId: 'o-1' }}
        emptyTitle="Sin envases en este pedido"
        emptyDescription="Nada asignado."
        listSearch="order=o-1"
      />
    </MemoryRouter>,
  );

describe('CylinderLinksCard', () => {
  it('lista serial con enlace a su ficha, tipo, estado y último movimiento', () => {
    list.mockReturnValue({
      data: { rows: [cyl('1', 'SPLG-00001', '2026-09-20T10:00:00Z'), cyl('2', 'SPLG-00002', null)], total: 2 },
      isPending: false,
    });
    renderCard();
    expect(screen.getByRole('link', { name: 'SPLG-00001' })).toHaveAttribute('href', '/physical-cylinders/1');
    expect(screen.getAllByText('Despachado')).toHaveLength(2);
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument();
    expect(screen.getByText('2 en total')).toBeInTheDocument();
    expect(screen.queryByText(/Ver todos en Envases/)).not.toBeInTheDocument();
  });

  it('si hay más de los que entran, ofrece verlos todos en Envases con el mismo filtro', () => {
    list.mockReturnValue({ data: { rows: [cyl('1', 'SPLG-00001', null)], total: 150 }, isPending: false });
    renderCard();
    expect(screen.getByRole('link', { name: 'Ver todos en Envases' })).toHaveAttribute(
      'href',
      '/physical-cylinders?order=o-1',
    );
  });

  it('sin envases muestra un vacío claro', () => {
    list.mockReturnValue({ data: { rows: [], total: 0 }, isPending: false });
    renderCard();
    expect(screen.getByText('Sin envases en este pedido')).toBeInTheDocument();
  });
});
