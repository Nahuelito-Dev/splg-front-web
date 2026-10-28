import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import type { Cylinder, CylinderMovement } from '../../services/api/types';

const cylinderQuery = vi.fn();
const historyQuery = vi.fn();
const vigenciaQuery = vi.fn();
// La foto se pide aparte (v2) y tiene sus propios tests: acá no hace falta.
vi.mock('../../common/components/ui/EntityPhoto', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  LinkedEntityPhoto: () => null,
}));

vi.mock('../../services/queries/physicalCylinders', () => ({
  useCylinder: () => cylinderQuery() as unknown,
  useCylinderHistory: () => historyQuery() as unknown,
  useCylinderVigencia: () => vigenciaQuery() as unknown,
  useRegisterInspection: () => ({ mutate: vi.fn(), isPending: false }),
  useTransitionCylinder: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCylinder: () => ({ mutate: vi.fn(), isPending: false }),
  useRetireCylinder: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateCylinder: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../services/queries/gasCylinders', () => ({ useGasCylinders: () => ({ data: undefined }) }));
vi.mock('../../services/queries/userNames', () => ({
  useUserNames: () => ({ nameOf: (id: string | null) => (id === 'u-1' ? 'Marta Gómez' : null), loading: false }),
}));
vi.mock('../../hooks', () => ({
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  useBackToList: () => vi.fn(),
}));

import { Breadcrumbs } from '../../common/components/Navbar/components/Breadcrumbs';
import { CrumbProvider } from '../../common/components/Navbar/CrumbProvider';
import { CylinderDetails } from './CylinderDetails';

const CYLINDER = {
  cylinder_id: 'c-1',
  serial: 'SPLG-00017',
  state: 'filled',
  deposit: 12000,
  gas_cylinder: { type: 'Garrafa 5kg', weight: 5 },
  current_customer: null,
  current_order_id: null,
  manufactured_at: '2025-01-01T00:00:00.000Z',
  last_inspection_at: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
} as unknown as Cylinder;

const VIGENCIA = {
  cylinderId: 'c-1',
  status: 'valid',
  daysRemaining: 40,
  manufacturedAt: '2025-01-01T00:00:00.000Z',
  lastInspectionAt: '2026-09-01T00:00:00.000Z',
  expiresAt: '2026-11-26T00:00:00.000Z',
  withdrawalPending: false,
  inspections: [
    {
      inspectionId: 'i-1',
      cylinderId: 'c-1',
      inspectedAt: '2026-09-01T00:00:00.000Z',
      result: 'approved',
      nextDueAt: '2026-11-26T00:00:00.000Z',
      notes: 'Sin observaciones',
    },
  ],
};

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
      <CrumbProvider>
        <Breadcrumbs />
        <Routes>
          <Route path="physical-cylinders/:id" element={<CylinderDetails />} />
        </Routes>
      </CrumbProvider>
    </MemoryRouter>,
  );

describe('CylinderDetails', () => {
  beforeEach(() => {
    cylinderQuery.mockReset();
    historyQuery.mockReset();
    vigenciaQuery.mockReset();
    vigenciaQuery.mockReturnValue({ data: VIGENCIA, isPending: false, error: null, refetch: vi.fn() });
  });
  afterEach(cleanup);

  it('un envase retirado muestra «Mover de estado» y «Dar de baja» apagados con su motivo, y no se edita', () => {
    cylinderQuery.mockReturnValue({
      data: { ...CYLINDER, state: 'retired' },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    historyQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('button', { name: 'Mover de estado' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Mover de estado' }).getAttribute('title')).toMatch(/retirado/);
    // «Editar» no se ofrece en un envase retirado: «Dar de baja» queda como única acción secundaria, a la vista.
    expect(screen.getByRole('button', { name: 'Dar de baja' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('muestra los datos del envase y su línea de tiempo', () => {
    cylinderQuery.mockReturnValue({ data: CYLINDER, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({ data: MOVEMENTS, isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('heading', { name: 'SPLG-00017' })).toBeInTheDocument();
    // la fabricación es un día de calendario: medianoche UTC no se muestra como el día anterior
    expect(screen.getByText('1 ene 2025')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Migas de pan' })).getByText('SPLG-00017')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
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

  it('muestra la vigencia con los días que faltan y el historial de revisiones', () => {
    cylinderQuery.mockReturnValue({ data: CYLINDER, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Vigencia y revisiones' })).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText(/Vence en 40 días/)).toBeInTheDocument();
    expect(screen.getByText('Sin observaciones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar revisión' })).toBeEnabled();
  });

  it('un envase vencido y afuera avisa que hay que retirarlo; sin revisión registrada no lo da por vencido', () => {
    cylinderQuery.mockReturnValue({ data: CYLINDER, isPending: false, error: null, refetch: vi.fn() });
    historyQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    vigenciaQuery.mockReturnValue({
      data: { ...VIGENCIA, status: 'expired', daysRemaining: -3, withdrawalPending: true },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/Venció hace 3 días/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/retirarlo cuando vuelva/);
    cleanup();

    vigenciaQuery.mockReturnValue({
      data: { ...VIGENCIA, status: 'unverified', daysRemaining: null, expiresAt: null, inspections: [] },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Sin revisión registrada')).toBeInTheDocument();
    expect(screen.getByText(/no es lo mismo que vencido/)).toBeInTheDocument();
    expect(screen.getByText('Sin revisiones')).toBeInTheDocument();
  });

  it('un envase retirado no admite revisiones', () => {
    cylinderQuery.mockReturnValue({
      data: { ...CYLINDER, state: 'retired' },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    historyQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('button', { name: 'Registrar revisión' })).toHaveAttribute('aria-disabled', 'true');
  });
});
