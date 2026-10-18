import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), leaves: vi.fn(), employees: vi.fn() }));

vi.mock('../../../services/queries/employees', () => ({ useEmployees: () => state.employees() as unknown }));
vi.mock('../../../services/queries/personnel', () => ({
  useCreateLeave: () => state.create() as unknown,
  useUpdateLeave: () => state.update() as unknown,
  useLeaves: (...args: unknown[]) => state.leaves(...args) as unknown,
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import type { Leave } from '../../../services/api/types';
import { LeaveFormModal } from './LeaveFormModal';

const otra = (over: Record<string, unknown> = {}) => ({
  leaveId: 'l-9',
  status: 'approved',
  startDate: '2099-12-10',
  endDate: '2099-12-20',
  ...over,
});

const fillPeriod = (from: string, to: string) => {
  fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: from } });
  fireEvent.change(screen.getByLabelText(/Hasta/), { target: { value: to } });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LeaveFormModal (CU-191, CU-316)', () => {
  const setup = (rows: unknown[] = []) => {
    const create = mutation();
    const update = mutation();
    state.create.mockReturnValue(create);
    state.update.mockReturnValue(update);
    state.employees.mockReturnValue(ok({ rows: [], total: 0 }));
    state.leaves.mockReturnValue(ok({ rows, total: rows.length }));
    return { create, update };
  };

  it('el alta manda empleado, tipo, período y motivo; muestra los días corridos', async () => {
    const { create } = setup();
    render(<LeaveFormModal open onClose={vi.fn()} employeeId="e-1" leave={null} />);
    fillPeriod('2099-12-01', '2099-12-14');
    expect(screen.getByText('14 días corridos')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Vacaciones' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar licencia' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      employeeId: 'e-1',
      body: { type: 'vacation', startDate: '2099-12-01', endDate: '2099-12-14', reason: 'Vacaciones' },
    });
  });

  it('antes de confirmar avisa de la licencia con la que se superpone y no deja enviar', async () => {
    const { create } = setup([otra()]);
    render(<LeaveFormModal open onClose={vi.fn()} employeeId="e-1" leave={null} />);
    fillPeriod('2099-12-01', '2099-12-14');
    expect(await screen.findByRole('alert')).toHaveTextContent('Se superpone con una licencia aprobada');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar licencia' }));
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('una rechazada o cancelada no cuenta como superposición', () => {
    setup([otra({ status: 'rejected' }), otra({ leaveId: 'l-10', status: 'cancelled' })]);
    render(<LeaveFormModal open onClose={vi.fn()} employeeId="e-1" leave={null} />);
    fillPeriod('2099-12-01', '2099-12-14');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un fin anterior al inicio se dice en el campo y no llama', async () => {
    const { create } = setup();
    render(<LeaveFormModal open onClose={vi.fn()} employeeId="e-1" leave={null} />);
    fillPeriod('2099-12-14', '2099-12-01');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar licencia' }));
    expect(await screen.findByText('El fin no puede ser anterior al inicio')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('desde la bandeja pide elegir al empleado', async () => {
    const { create } = setup();
    render(<LeaveFormModal open onClose={vi.fn()} leave={null} />);
    fillPeriod('2099-12-01', '2099-12-14');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar licencia' }));
    expect(await screen.findByText('Elegí al empleado')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('al modificar manda los cambios a esa licencia y no se cuenta a sí misma en la superposición', async () => {
    const { update } = setup([
      otra({ leaveId: 'l-1', status: 'requested', startDate: '2099-12-01', endDate: '2099-12-14' }),
    ]);
    const leave = {
      leaveId: 'l-1',
      employeeId: 'e-1',
      employeeName: 'Ana Pérez',
      type: 'sick',
      startDate: '2099-12-01',
      endDate: '2099-12-14',
      reason: null,
    } as unknown as Leave;
    render(<LeaveFormModal open onClose={vi.fn()} leave={leave} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fillPeriod('2099-12-01', '2099-12-18');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toEqual({
      id: 'l-1',
      body: { type: 'sick', startDate: '2099-12-01', endDate: '2099-12-18', reason: undefined },
    });
  });
});
