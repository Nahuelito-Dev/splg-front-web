import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ expirations: vi.fn(), needsDistributor: false }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: state.needsDistributor }),
}));
vi.mock('../../services/queries/fleet', () => ({
  useFleetExpirations: (...args: unknown[]) => state.expirations(...args) as unknown,
}));
vi.mock('./components/ExpirationsTable', () => ({
  ExpirationsTable: ({
    rows,
    identityHeader,
    onView,
  }: {
    rows: Array<{ key: string; title: string; ownerId: string }>;
    identityHeader: string;
    onView: (row: { ownerId: string }) => void;
  }) => (
    <ul aria-label={identityHeader}>
      {rows.map((row) => (
        <li key={row.key}>
          <button type="button" onClick={() => onView(row)}>
            {row.title}
          </button>
        </li>
      ))}
    </ul>
  ),
}));

import { FleetExpirations } from './FleetExpirations';

const item = (taskId: string, planName = 'Examen psicofísico') => ({
  taskId,
  planId: 'p-1',
  planName,
  criticality: 'blocking',
  dueAt: '2020-01-01T00:00:00.000Z',
  expirationStatus: 'expired',
  daysUntilDue: -10,
});

const RESPUESTA = {
  withinDays: 30,
  vehicles: [
    {
      carId: 'c-1',
      carPatent: 'AB123CD',
      carBrand: 'Ford',
      carModel: 'Ranger',
      isLocked: true,
      items: [item('t-v', 'VTV')],
    },
  ],
  drivers: [],
  employees: [
    {
      employeeId: 'e-1',
      fullName: 'Ana Pérez',
      fileNumber: '0042',
      positionName: 'Chofer',
      category: 'driver',
      isLocked: true,
      items: [item('t-e')],
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
});

describe('FleetExpirations: vehículos, choferes y personal (CU-139, CU-187)', () => {
  it('abre en vehículos y choferes y pide sólo eso', () => {
    state.expirations.mockReturnValue(ok(RESPUESTA));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations' });
    expect(state.expirations).toHaveBeenLastCalledWith(30, true, { subject: 'vehicle', category: undefined });
    expect(screen.getByRole('button', { name: 'Ford Ranger' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ana Pérez' })).not.toBeInTheDocument();
  });

  it('con ?subject=employee abre el personal, con su categoría de puesto', () => {
    state.expirations.mockReturnValue(ok(RESPUESTA));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations?subject=employee&category=driver' });
    expect(state.expirations).toHaveBeenLastCalledWith(30, true, { subject: 'employee', category: 'driver' });
    expect(screen.getByRole('tab', { name: 'Personal' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ford Ranger' })).not.toBeInTheDocument();
  });

  it('una categoría que no existe se ignora', () => {
    state.expirations.mockReturnValue(ok(RESPUESTA));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations?subject=employee&category=inventada' });
    expect(state.expirations).toHaveBeenLastCalledWith(30, true, { subject: 'employee', category: undefined });
  });

  it('cambiar de pestaña cambia lo que se pide', () => {
    state.expirations.mockReturnValue(ok(RESPUESTA));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations' });
    fireEvent.click(screen.getByRole('tab', { name: 'Personal' }));
    expect(state.expirations).toHaveBeenLastCalledWith(30, true, { subject: 'employee', category: undefined });
  });

  it('el buscador filtra a los empleados por nombre y por documento', () => {
    state.expirations.mockReturnValue(ok(RESPUESTA));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations?subject=employee' });
    fireEvent.change(screen.getByLabelText('Buscar vencimientos'), { target: { value: 'psicof' } });
    expect(screen.getByRole('button', { name: 'Ana Pérez' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar vencimientos'), { target: { value: 'zzz' } });
    expect(screen.queryByRole('button', { name: 'Ana Pérez' })).not.toBeInTheDocument();
  });

  it('un administrador general sin «Ver como» no consulta y lo explica', () => {
    state.needsDistributor = true;
    state.expirations.mockReturnValue(ok(undefined));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations' });
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.expirations).toHaveBeenLastCalledWith(30, false, expect.anything());
  });

  it('un error del back se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.expirations.mockReturnValue(failed(refetch));
    renderPage(<FleetExpirations />, { url: '/fleet/expirations' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
