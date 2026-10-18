import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  leaves: vi.fn(),
  employees: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  needsDistributor: false,
  canWrite: true,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canWrite: state.canWrite,
    writeHint: undefined,
    needsDistributor: state.needsDistributor,
  }),
}));
vi.mock('../../services/queries/employees', () => ({
  useEmployees: () => state.employees() as unknown,
}));
vi.mock('../../services/queries/personnel', () => ({
  useLeaves: (...args: unknown[]) => state.leaves(...args) as unknown,
  useApproveLeave: () => state.approve() as unknown,
  useRejectLeave: () => state.reject() as unknown,
  useCancelLeave: () => state.cancel() as unknown,
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/LeaveFormModal', () => ({
  LeaveFormModal: ({ open, leave }: { open: boolean; leave: unknown }) =>
    open ? <p>{leave ? 'Modificar licencia (formulario)' : 'Registrar licencia (formulario)'}</p> : null,
}));

import { Leaves } from './Leaves';

const licencia = (over: Record<string, unknown> = {}) => ({
  leaveId: 'l-1',
  employeeId: 'e-1',
  employeeName: 'Ana Pérez',
  employeeFileNumber: '0042',
  type: 'vacation',
  startDate: '2099-12-01',
  endDate: '2099-12-14',
  days: 14,
  status: 'requested',
  reason: 'Vacaciones de verano',
  rejectionReason: null,
  ...over,
});
const page = (rows: unknown[]) => ok({ rows, total: rows.length });

beforeEach(() => {
  state.employees.mockReturnValue(ok({ rows: [], total: 0 }));
  state.approve.mockReturnValue(mutation());
  state.reject.mockReturnValue(mutation());
  state.cancel.mockReturnValue(mutation());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
  state.canWrite = true;
});

describeListStates({
  name: 'Licencias',
  url: '/leaves',
  page: <Leaves />,
  setResult: (result) => state.leaves.mockReturnValue(result),
  withRow: () => page([licencia()]),
  withoutRows: () => page([]),
  rowText: 'Vacaciones de verano',
  emptyText: 'No hay solicitudes pendientes',
  loadingLabel: 'Cargando licencias',
});

describe('Licencias: la bandeja', () => {
  it('abre en las pendientes de resolver y pide sólo esas', () => {
    state.leaves.mockReturnValue(page([licencia()]));
    renderPage(<Leaves />, { url: '/leaves' });
    expect(state.leaves).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0 }),
      expect.objectContaining({ status: 'requested' }),
      true,
    );
    expect(screen.getByRole('tab', { name: 'Pendientes' })).toHaveAttribute('aria-selected', 'true');
  });

  it('cada pestaña pide su estado; «Todas» no filtra', () => {
    state.leaves.mockReturnValue(page([]));
    renderPage(<Leaves />, { url: '/leaves' });
    fireEvent.click(screen.getByRole('tab', { name: 'Aprobadas' }));
    expect(state.leaves).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved' }),
      true,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Todas' }));
    expect(state.leaves).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ status: undefined }),
      true,
    );
  });

  it('respeta los filtros de la URL: tipo, empleado y período', () => {
    state.leaves.mockReturnValue(page([]));
    renderPage(<Leaves />, { url: '/leaves?status=approved&type=sick&employee=e-9&from=2099-01-01&to=2099-01-31' });
    expect(state.leaves).toHaveBeenLastCalledWith(
      expect.anything(),
      { status: 'approved', type: 'sick', employeeId: 'e-9', from: '2099-01-01', to: '2099-01-31' },
      true,
    );
  });

  it('un período invertido no consulta y avisa en el campo', () => {
    state.leaves.mockReturnValue(page([]));
    renderPage(<Leaves />, { url: '/leaves?from=2099-02-01&to=2099-01-01' });
    expect(state.leaves).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), false);
    expect(screen.getByText('No puede ser anterior al inicio')).toBeInTheDocument();
  });

  it('un administrador general sin «Ver como» no consulta y lo explica', () => {
    state.needsDistributor = true;
    state.leaves.mockReturnValue(page([]));
    renderPage(<Leaves />, { url: '/leaves' });
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.leaves).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), false);
  });

  it('aprobar llama a la aprobación de esa licencia', () => {
    const approve = mutation();
    state.approve.mockReturnValue(approve);
    state.leaves.mockReturnValue(page([licencia()]));
    renderPage(<Leaves />, { url: '/leaves' });
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(approve.mutate).toHaveBeenCalledWith('l-1', expect.anything());
  });

  it('rechazar pide el motivo: sin él no llama; con él lo manda recortado', async () => {
    const reject = mutation();
    state.reject.mockReturnValue(reject);
    state.leaves.mockReturnValue(page([licencia()]));
    renderPage(<Leaves />, { url: '/leaves' });
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar licencia' }));
    expect(reject.mutate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/), { target: { value: '  Sin cobertura  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar licencia' }));
    await waitFor(() => expect(reject.mutate).toHaveBeenCalled());
    expect(reject.mutate.mock.calls[0][0]).toEqual({ id: 'l-1', body: { reason: 'Sin cobertura' } });
  });

  it('cancelar confirma antes; si se arrepiente no llama', async () => {
    const cancel = mutation();
    state.cancel.mockReturnValue(cancel);
    state.leaves.mockReturnValue(page([licencia({ status: 'approved' })]));
    renderPage(<Leaves />, { url: '/leaves?status=approved' });
    state.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect(cancel.mutate).not.toHaveBeenCalled();
    state.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(cancel.mutate).toHaveBeenCalledWith('l-1', expect.anything()));
  });

  it('una aprobada no se aprueba ni se modifica, y una rechazada no admite nada', () => {
    state.leaves.mockReturnValue(
      page([licencia({ status: 'approved' }), licencia({ leaveId: 'l-2', status: 'rejected', rejectionReason: 'No' })]),
    );
    renderPage(<Leaves />, { url: '/leaves?status=all' });
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modificar' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(1);
  });

  it('modificar abre el formulario con esa licencia; «Registrar licencia» abre el alta', () => {
    state.leaves.mockReturnValue(page([licencia()]));
    renderPage(<Leaves />, { url: '/leaves' });
    fireEvent.click(screen.getByRole('button', { name: 'Modificar' }));
    expect(screen.getByText('Modificar licencia (formulario)')).toBeInTheDocument();
    cleanup();
    state.leaves.mockReturnValue(page([]));
    renderPage(<Leaves />, { url: '/leaves' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar licencia' }));
    expect(screen.getByText('Registrar licencia (formulario)')).toBeInTheDocument();
  });

  it('sin permiso de escritura la bandeja es de sólo lectura', () => {
    state.canWrite = false;
    state.leaves.mockReturnValue(page([licencia()]));
    renderPage(<Leaves />, { url: '/leaves' });
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });
});
