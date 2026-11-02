import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ employee: vi.fn(), canWrite: true }));

vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../common/components/AttachmentsPanel', () => ({ AttachmentsPanel: () => null }));
vi.mock('../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PhotoThumb: () => null,
  EntityPhoto: () => null,
  AuditHistoryLink: () => null,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canWrite: state.canWrite,
    writeHint: state.canWrite ? undefined : 'Elegí una distribuidora',
  }),
  useBackToList: () => () => undefined,
  useProfileTab: () => ['summary', vi.fn()],
}));
vi.mock('../../services/queries/employees', () => ({
  useEmployee: () => state.employee() as unknown,
  useDeleteEmployee: () => mutation(),
}));
// `formatDate` tiene una guarda para el YYYY-MM-DD: acá se la hace fallar para que cada pantalla pruebe que usa `formatDay`.
vi.mock('../../utils/format', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  formatDate: () => 'USÓ formatDate',
}));
vi.mock('./components/TerminateEmployeeModal', () => ({ TerminateEmployeeModal: () => null }));
vi.mock('./components/ReinstateEmployeeModal', () => ({
  ReinstateEmployeeModal: ({ open }: { open: boolean }) => (open ? <p>Reincorporar (formulario)</p> : null),
}));
vi.mock('./components/GrantAccountModal', () => ({
  GrantAccountModal: ({ open }: { open: boolean }) => (open ? <p>Cuenta de acceso (formulario)</p> : null),
}));

import { EmployeeDetails } from './EmployeeDetails';

const EMPLEADO = (over: Record<string, unknown> = {}) => ({
  employeeId: 'e-1',
  fileNumber: '0042',
  firstName: 'Pedro',
  lastName: 'Pérez',
  status: 'active',
  hasAccount: false,
  userId: null,
  documentType: 'dni',
  documentNumber: '30111222',
  employmentType: 'permanent',
  hireDate: '2025-01-10',
  terminationDate: null,
  terminationReason: null,
  position: { positionId: 'p-1', name: 'Chofer', category: 'driver' },
  photoUrl: null,
  ...over,
});

const draw = () => renderPage(<EmployeeDetails />, { url: '/employees/details/e-1', path: '/employees/details/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

describe('EmployeeDetails: reincorporación y cuenta de acceso', () => {
  it('un chofer activo sin cuenta ofrece crearla y abre el formulario', () => {
    state.employee.mockReturnValue(ok(EMPLEADO()));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Crear cuenta de acceso' }));
    expect(screen.getByText('Cuenta de acceso (formulario)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reincorporar' })).not.toBeInTheDocument();
  });

  it('un legajo que no es de chofer no ofrece cuenta (el back responde 400)', () => {
    state.employee.mockReturnValue(
      ok(EMPLEADO({ position: { positionId: 'p-2', name: 'Administrativa', category: 'administration' } })),
    );
    draw();
    expect(screen.queryByRole('button', { name: 'Crear cuenta de acceso' })).not.toBeInTheDocument();
  });

  it('quien ya tiene cuenta no ofrece crearla de nuevo', () => {
    state.employee.mockReturnValue(ok(EMPLEADO({ hasAccount: true })));
    draw();
    expect(screen.queryByRole('button', { name: 'Crear cuenta de acceso' })).not.toBeInTheDocument();
  });

  it('un egresado ofrece reincorporar y no registrar otro egreso ni crear cuenta', () => {
    state.employee.mockReturnValue(
      ok(EMPLEADO({ status: 'terminated', terminationDate: '2026-09-01', terminationReason: 'resignation' })),
    );
    draw();
    expect(screen.queryByRole('button', { name: 'Registrar egreso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear cuenta de acceso' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reincorporar' }));
    expect(screen.getByText('Reincorporar (formulario)')).toBeInTheDocument();
  });

  it('un activo no ofrece reincorporar', () => {
    state.employee.mockReturnValue(ok(EMPLEADO()));
    draw();
    expect(screen.queryByRole('button', { name: 'Reincorporar' })).not.toBeInTheDocument();
  });

  it('un error del back se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.employee.mockReturnValue(failed(refetch));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('EmployeeDetails: fechas de calendario', () => {
  it('ingreso (cabecera y ficha), nacimiento y egreso muestran el día guardado, cada uno el suyo', () => {
    state.employee.mockReturnValue(
      ok(
        EMPLEADO({
          status: 'terminated',
          hireDate: '2026-11-02',
          birthDate: '1990-03-05',
          terminationDate: '2026-12-01',
          terminationReason: 'resignation',
        }),
      ),
    );
    draw();
    expect(screen.getAllByText('2 nov 2026')).toHaveLength(2);
    expect(screen.getByText('5 mar 1990')).toBeInTheDocument();
    expect(screen.getByText('1 dic 2026')).toBeInTheDocument();
    expect(screen.queryByText('USÓ formatDate')).not.toBeInTheDocument();
    expect(screen.queryByText('1 nov 2026')).not.toBeInTheDocument();
  });
});
