import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Employee } from '../../../services/api/types';
import { mutation } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ grant: vi.fn(), reinstate: vi.fn(), create: vi.fn(), update: vi.fn() }));

vi.mock('../../../services/queries/employees', () => ({
  useGrantEmployeeAccount: () => state.grant() as unknown,
  useReinstateEmployee: () => state.reinstate() as unknown,
  useCreateJobPosition: () => state.create() as unknown,
  useUpdateJobPosition: () => state.update() as unknown,
}));

vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { GrantAccountModal } from './GrantAccountModal';
import { JobPositionFormModal } from './JobPositionFormModal';
import { ReinstateEmployeeModal } from './ReinstateEmployeeModal';

const EMPLEADO = { employeeId: 'e-1', hasAccount: true } as unknown as Employee;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GrantAccountModal', () => {
  it('valida el correo y la contraseña antes de llamar al back', async () => {
    const grant = mutation();
    state.grant.mockReturnValue(grant);
    render(<GrantAccountModal open onClose={vi.fn()} employee={EMPLEADO} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ingresá el correo')).toBeInTheDocument();
    expect(
      screen.getByText('Entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número'),
    ).toBeInTheDocument();
    expect(grant.mutate).not.toHaveBeenCalled();
  });

  it('manda correo y contraseña, sin teléfono si no se completó', async () => {
    const grant = mutation();
    state.grant.mockReturnValue(grant);
    render(<GrantAccountModal open onClose={vi.fn()} employee={EMPLEADO} />);
    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: 'ana@correo.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(grant.mutate).toHaveBeenCalled());
    expect(grant.mutate.mock.calls[0][0]).toEqual({
      id: 'e-1',
      body: { email: 'ana@correo.com', password: 'Ejemplo2026x' },
    });
  });

  it('al crear la cuenta vacía el formulario y la mutación (la contraseña no queda en memoria)', async () => {
    const grant = mutation();
    grant.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onSuccess: () => void }).onSuccess(),
    );
    state.grant.mockReturnValue(grant);
    render(<GrantAccountModal open onClose={vi.fn()} employee={EMPLEADO} />);
    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: 'ana@correo.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'Ejemplo2026x' } });
    grant.reset.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(grant.reset).toHaveBeenCalled());
    expect(screen.getByLabelText(/Contraseña/)).toHaveValue('');
  });

  it('al cerrar y reabrir el formulario no conserva la contraseña', () => {
    state.grant.mockReturnValue(mutation());
    const { rerender } = render(<GrantAccountModal open onClose={vi.fn()} employee={EMPLEADO} />);
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'Ejemplo2026x' } });
    rerender(<GrantAccountModal open={false} onClose={vi.fn()} employee={EMPLEADO} />);
    rerender(<GrantAccountModal open onClose={vi.fn()} employee={EMPLEADO} />);
    expect(screen.getByLabelText(/Contraseña/)).toHaveValue('');
  });

  it('rechaza un teléfono que no está en formato internacional', async () => {
    const grant = mutation();
    state.grant.mockReturnValue(grant);
    render(<GrantAccountModal open onClose={vi.fn()} employee={EMPLEADO} />);
    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: 'ana@correo.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '3764000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(/formato internacional/i)).toBeInTheDocument();
    expect(grant.mutate).not.toHaveBeenCalled();
  });
});

describe('ReinstateEmployeeModal', () => {
  it('sin fecha manda el cuerpo vacío (el back usa hoy)', async () => {
    const reinstate = mutation();
    state.reinstate.mockReturnValue(reinstate);
    render(<ReinstateEmployeeModal open onClose={vi.fn()} employee={EMPLEADO} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reincorporar' }));
    await waitFor(() => expect(reinstate.mutate).toHaveBeenCalled());
    expect(reinstate.mutate.mock.calls[0][0]).toEqual({ id: 'e-1', body: {} });
  });

  it('con fecha la manda, y avisa que la cuenta sigue bloqueada', async () => {
    const reinstate = mutation();
    state.reinstate.mockReturnValue(reinstate);
    render(<ReinstateEmployeeModal open onClose={vi.fn()} employee={EMPLEADO} />);
    expect(screen.getByText(/cuenta de acceso sigue bloqueada/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nueva fecha de ingreso/), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reincorporar' }));
    await waitFor(() => expect(reinstate.mutate).toHaveBeenCalled());
    expect(reinstate.mutate.mock.calls[0][0]).toEqual({ id: 'e-1', body: { hireDate: '2026-10-15' } });
  });
});

describe('JobPositionFormModal', () => {
  it('crea el puesto con nombre y categoría', async () => {
    const create = mutation();
    state.create.mockReturnValue(create);
    state.update.mockReturnValue(mutation());
    render(<JobPositionFormModal open onClose={vi.fn()} position={null} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Ayudante de depósito' } });
    fireEvent.change(screen.getByLabelText(/Categoría/), { target: { value: 'warehouse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear puesto' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      name: 'Ayudante de depósito',
      category: 'warehouse',
      isActive: true,
    });
  });

  it('exige un nombre de al menos 2 caracteres', async () => {
    const create = mutation();
    state.create.mockReturnValue(create);
    state.update.mockReturnValue(mutation());
    render(<JobPositionFormModal open onClose={vi.fn()} position={null} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear puesto' }));
    expect(await screen.findByText('Al menos 2 caracteres')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('al editar actualiza el puesto por su id', async () => {
    const update = mutation();
    state.create.mockReturnValue(mutation());
    state.update.mockReturnValue(update);
    const position = { positionId: 'p-1', name: 'Chofer', category: 'driver', isActive: true, activeEmployees: 1 };
    render(<JobPositionFormModal open onClose={vi.fn()} position={position as never} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Chofer de reparto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toEqual({
      id: 'p-1',
      body: { name: 'Chofer de reparto', category: 'driver', isActive: true },
    });
  });
});
