import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ register: vi.fn(), correct: vi.fn(), employees: vi.fn() }));

vi.mock('../../../services/queries/employees', () => ({ useEmployees: () => state.employees() as unknown }));
vi.mock('../../../services/queries/personnel', () => ({
  useRegisterAttendance: () => state.register() as unknown,
  useCorrectAttendance: () => state.correct() as unknown,
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import type { Attendance } from '../../../services/api/types';
import { AttendanceCorrectModal } from './AttendanceCorrectModal';
import { AttendanceFormModal } from './AttendanceFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AttendanceFormModal (CU-189)', () => {
  it('desde la grilla pide elegir al empleado antes de llamar al back', async () => {
    const register = mutation();
    state.register.mockReturnValue(register);
    state.employees.mockReturnValue(
      ok({ rows: [{ employeeId: 'e-1', firstName: 'Ana', lastName: 'Pérez', fileNumber: '0042' }], total: 1 }),
    );
    render(<AttendanceFormModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('Elegí al empleado')).toBeInTheDocument();
    expect(register.mutate).not.toHaveBeenCalled();
  });

  it('desde la ficha ya conoce al empleado y manda el ingreso como instante ISO, sin egreso si no se indicó', async () => {
    const register = mutation();
    state.register.mockReturnValue(register);
    state.employees.mockReturnValue(ok({ rows: [], total: 0 }));
    render(<AttendanceFormModal open onClose={vi.fn()} employeeId="e-1" />);
    expect(screen.queryByLabelText(/Empleado/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ingreso/), { target: { value: '2026-03-02T08:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(register.mutate).toHaveBeenCalled());
    expect(register.mutate.mock.calls[0][0]).toEqual({
      employeeId: 'e-1',
      body: { checkInAt: new Date('2026-03-02T08:00').toISOString(), checkOutAt: undefined },
    });
  });

  it('un egreso que no es posterior al ingreso no se manda', async () => {
    const register = mutation();
    state.register.mockReturnValue(register);
    state.employees.mockReturnValue(ok({ rows: [], total: 0 }));
    render(<AttendanceFormModal open onClose={vi.fn()} employeeId="e-1" />);
    fireEvent.change(screen.getByLabelText(/Ingreso/), { target: { value: '2026-03-02T08:00' } });
    fireEvent.change(screen.getByLabelText(/Egreso/), { target: { value: '2026-03-02T07:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('El egreso tiene que ser posterior al ingreso')).toBeInTheDocument();
    expect(register.mutate).not.toHaveBeenCalled();
  });
});

describe('AttendanceCorrectModal (CU-313)', () => {
  const JORNADA = {
    attendanceId: 'a-1',
    employeeName: 'Ana Pérez',
    checkInAt: new Date('2026-03-02T08:00').toISOString(),
    checkOutAt: null,
  } as unknown as Attendance;

  it('exige la nota que explica el cambio', async () => {
    const correct = mutation();
    state.correct.mockReturnValue(correct);
    render(<AttendanceCorrectModal open onClose={vi.fn()} attendance={JORNADA} />);
    fireEvent.change(screen.getByLabelText(/Egreso/), { target: { value: '2026-03-02T16:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }));
    expect(await screen.findByText('Explicá el cambio en una nota')).toBeInTheDocument();
    expect(correct.mutate).not.toHaveBeenCalled();
  });

  it('manda el ingreso, el egreso y la nota de esa jornada', async () => {
    const correct = mutation();
    state.correct.mockReturnValue(correct);
    render(<AttendanceCorrectModal open onClose={vi.fn()} attendance={JORNADA} />);
    fireEvent.change(screen.getByLabelText(/Egreso/), { target: { value: '2026-03-02T16:00' } });
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Olvidó marcar la salida' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }));
    await waitFor(() => expect(correct.mutate).toHaveBeenCalled());
    expect(correct.mutate.mock.calls[0][0]).toEqual({
      id: 'a-1',
      body: {
        checkInAt: JORNADA.checkInAt,
        checkOutAt: new Date('2026-03-02T16:00').toISOString(),
        notes: 'Olvidó marcar la salida',
      },
    });
  });
});
