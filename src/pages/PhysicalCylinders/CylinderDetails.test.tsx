import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import type { Cylinder, CylinderMovement } from '../../services/api/types';

const cylinderQuery = vi.fn();
const historyQuery = vi.fn();
vi.mock('../../services/queries/physicalCylinders', () => ({
  useCylinder: () => cylinderQuery() as unknown,
  useCylinderHistory: () => historyQuery() as unknown,
  useTransitionCylinder: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../services/queries/userNames', () => ({
  useUserNames: () => ({ nameOf: (id: string | null) => (id === 'u-1' ? 'Marta Gómez' : null), loading: false }),
}));
vi.mock('../../hooks', () => ({
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  useBackToList: () => vi.fn(),
}));

import { CylinderDetails } from './CylinderDetails';

const CYLINDER = {
  cylinder_id: 'c-1',
  serial: 'SPLG-00017',
  state: 'filled',
  deposit: 12000,
  gas_cylinder: { type: 'Garrafa 5kg', weight: 5 },
  current_customer: null,
  current_order_id: null,
  manufactured_at: null,
  last_inspection_at: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
} as unknown as Cylinder;

const MOVEMENTS = [
  {
    movement_id: 'm-1',
    from_state: 'in_depot',
    to_state: 'filled',
    order_id: null,
    actor_user_id: 'u-1',
    note: 'Llenado',
    createdAt: '2026-09-02T10:00:00.000Z',
  },
] as unknown as CylinderMovement[];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/physical-cylinders/c-1']}>
      <Routes>
        <Route path="physical-cylinders/:id" element={<CylinderDetails />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CylinderDetails', () => {
  beforeEach(() => {
    cylinderQuery.mockReset();
    historyQuery.mockReset();
  });
  afterEach(cleanup);

  it('muestra los datos del envase y su línea de tiempo', () => {
    cylinderQuery.mockReturnValue({ data: CYLINDER, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({ data: MOVEMENTS, isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('heading', { name: 'SPLG-00017' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Ruta de la ficha' })).toHaveTextContent('SPLG-00017');
    expect(screen.getByText('Garrafa 5kg · 5 kg')).toBeInTheDocument();
    expect(screen.getByText('Llenado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mover de estado' })).toBeEnabled();
  });

  it('muestra quién hizo cada movimiento, con enlace a su ficha', () => {
    cylinderQuery.mockReturnValue({ data: CYLINDER, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({
      data: [...MOVEMENTS, { ...MOVEMENTS[0], movement_id: 'm-2', actor_user_id: null, note: 'Automático' }],
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('link', { name: 'Marta Gómez' })).toHaveAttribute('href', '/users/details/u-1');
    expect(screen.getByText(/Sin registro de quién lo hizo/)).toBeInTheDocument();
    expect(screen.queryByText(/Por el sistema/)).not.toBeInTheDocument();
  });

  it('en poder de: enlaza al cliente que lo tiene ahora', () => {
    const withCustomer = {
      ...CYLINDER,
      current_customer_id: 'c-9',
      current_customer: { user_id: 'c-9', full_name: 'Lucía Díaz', phone_number: '+5493764000000' },
    } as unknown as Cylinder;
    cylinderQuery.mockReturnValue({ data: withCustomer, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('link', { name: 'Lucía Díaz' })).toHaveAttribute('href', '/users/details/c-9');
  });

  it('un 404 dice que no existe, sin botón de reintentar', () => {
    cylinderQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ApiError(404, ['x']),
      refetch: vi.fn(),
    });
    historyQuery.mockReturnValue({ data: undefined, isPending: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('El envase no existe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('un id que no es UUID (400) también es "no existe", sin reintentar', () => {
    cylinderQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ApiError(400, ['Validation failed (uuid is expected)']),
      refetch: vi.fn(),
    });
    historyQuery.mockReturnValue({ data: undefined, isPending: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('El envase no existe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('un error de servidor ofrece reintentar', () => {
    cylinderQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ApiError(500, ['boom']),
      refetch: vi.fn(),
    });
    historyQuery.mockReturnValue({ data: undefined, isPending: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('sin movimientos lo avisa', () => {
    cylinderQuery.mockReturnValue({ data: CYLINDER, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument();
  });
});
