import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => vi.fn());
const positions = vi.hoisted(() => vi.fn());
const permissions = vi.hoisted(() => ({ needsDistributor: false }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined, needsDistributor: permissions.needsDistributor }),
}));
vi.mock('../../services/queries/employees', () => ({
  useEmployees: (...args: unknown[]) => server(...args) as unknown,
  useEmployeeStatusCounts: () => ({ all: 3, active: 2, terminated: 1 }),
  useJobPositions: (...args: unknown[]) => positions(...args) as unknown,
}));
vi.mock('./components/EmployeeFormModal', () => ({ EmployeeFormModal: () => null }));

import { Employees } from './Employees';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.needsDistributor = false;
});

const PUESTOS = [{ positionId: 'p-1', name: 'Chofer', category: 'driver', isActive: true, activeEmployees: 1 }];
const renderPage = (url = '/employees') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Employees />
    </MemoryRouter>,
  );

describe('Employees', () => {
  it('sin distribuidora elegida no consulta y lo explica', () => {
    permissions.needsDistributor = true;
    server.mockReturnValue({ data: undefined, isFetching: false, error: null });
    positions.mockReturnValue({ data: undefined, isPending: false });
    renderPage();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(positions).toHaveBeenCalledWith(false);
    expect(server).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), false);
  });

  it('un error de la lista se muestra con Reintentar, no como "No hay legajos"', () => {
    const refetch = vi.fn();
    server.mockReturnValue({ data: undefined, isFetching: false, error: new Error('boom'), refetch });
    positions.mockReturnValue({ data: PUESTOS, isPending: false });
    renderPage();
    expect(screen.queryByText('No hay legajos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('ignora un ?position= que no es un puesto cargado', () => {
    server.mockReturnValue({ data: { rows: [], total: 0 }, isFetching: false, error: null });
    positions.mockReturnValue({ data: PUESTOS, isPending: false });
    renderPage('/employees?position=inventado');
    expect(server).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ positionId: undefined }),
      true,
    );
    cleanup();
    renderPage('/employees?position=p-1');
    expect(server).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ positionId: 'p-1' }), true);
  });

  it('las pestañas de estado muestran la cantidad de legajos de cada una', () => {
    server.mockReturnValue({ data: { rows: [], total: 0 }, isFetching: false, error: null });
    positions.mockReturnValue({ data: PUESTOS, isPending: false });
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Activos? 2/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Egresad[oa]s? 1/ })).toBeInTheDocument();
  });
});
