import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import type { Employee } from '../../../services/api/types';
import { mutation } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ terminate: vi.fn() }));

vi.mock('../../../services/queries/employees', () => ({
  useTerminateEmployee: () => state.terminate() as unknown,
}));

import { TerminateEmployeeModal } from './TerminateEmployeeModal';

const EMPLEADO = { employeeId: 'e-1', hasAccount: true, hireDate: '2026-01-01' } as unknown as Employee;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Con el notificador real (`SnackbarProvider`): lo que se ve en pantalla es lo que ve el administrador. */
const abrir = (onClose = vi.fn()) =>
  render(
    <SnackbarProvider>
      <TerminateEmployeeModal open onClose={onClose} employee={EMPLEADO} />
    </SnackbarProvider>,
  );

const enviar = () => {
  fireEvent.change(screen.getByLabelText(/Fecha de egreso/), { target: { value: '2026-11-02' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }));
};

describe('TerminateEmployeeModal (CU-181)', () => {
  it('manda la fecha y el motivo', async () => {
    const terminate = mutation();
    state.terminate.mockReturnValue(terminate);
    abrir();
    enviar();
    await waitFor(() => expect(terminate.mutate).toHaveBeenCalled());
    expect(terminate.mutate.mock.calls[0][0]).toEqual({
      id: 'e-1',
      body: { terminationDate: '2026-11-02', reason: 'resignation' },
    });
  });

  it('si el back rechaza por la rendición pendiente, el aviso en pantalla trae su texto y el formulario sigue abierto', async () => {
    const mensaje =
      'No se puede dar de baja al chofer mientras tenga una rendición pendiente (rendición N° 26, abierta, del 02/11/2026): cerrala antes';
    const terminate = mutation();
    terminate.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onError: (e: unknown) => void }).onError(new ApiError(409, [mensaje])),
    );
    state.terminate.mockReturnValue(terminate);
    const onClose = vi.fn();
    abrir(onClose);
    enviar();
    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Registrar egreso' })).toBeInTheDocument();
  });
});
