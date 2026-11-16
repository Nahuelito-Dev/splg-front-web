import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation } from '../../../test/pageTest';

const resolve = vi.hoisted(() => ({ current: {} as ReturnType<typeof mutation> }));
vi.mock('../../../services/queries/recovery', () => ({ useResolveRecoveryCase: () => resolve.current }));
const notifications = vi.hoisted(() => ({ notify: { success: vi.fn(), error: vi.fn() }, confirm: vi.fn() }));
vi.mock('../../../utils/notifications', () => notifications);

import { RecoveryResolveModal } from './RecoveryResolveModal';

const CASE = {
  caseId: 'c-1',
  depositAmount: 70000,
  cylinder: { serial: 'SPLG-00197' },
  customer: { fullName: 'Gonzalo Acosta' },
} as never;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const open = (onClose = vi.fn()) => {
  resolve.current = mutation();
  render(<RecoveryResolveModal recoveryCase={CASE} onClose={onClose} />);
  return onClose;
};

describe('RecoveryResolveModal', () => {
  it('muestra el envase, el cliente y el importe, y no deja decidir sin elegir ni explicar', () => {
    open();
    expect(screen.getByText(/SPLG-00197 · Gonzalo Acosta/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar decisión' })).toBeDisabled();
  });

  it('cada decisión explica qué hace; cobrar aclara que el sistema no cobra', () => {
    open();
    fireEvent.click(screen.getByLabelText('Cobrar el depósito'));
    expect(screen.getByText(/El sistema no cobra/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dar el envase de baja'));
    expect(screen.getByText(/sale del inventario/)).toBeInTheDocument();
  });

  it('una nota de menos de 10 caracteres no deja registrar', async () => {
    open();
    fireEvent.click(screen.getByLabelText('Dar el envase de baja'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), { target: { value: 'corta' } });
    expect(await screen.findByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar decisión' })).toBeDisabled();
  });

  it('manda la decisión con la nota recortada', async () => {
    open();
    fireEvent.click(screen.getByLabelText('Dar el envase de baja'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), {
      target: { value: '  Extraviado por el cliente  ' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar decisión' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(resolve.current.mutate).toHaveBeenCalled());
    expect(resolve.current.mutate.mock.calls[0][0]).toEqual({
      id: 'c-1',
      body: { decision: 'write_off', note: 'Extraviado por el cliente' },
    });
  });

  it('al guardar avisa y cierra', async () => {
    const onClose = open();
    fireEvent.click(screen.getByLabelText('Cerrar sin cargo'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), {
      target: { value: 'Cliente histórico, sin cargo' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar decisión' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(resolve.current.mutate).toHaveBeenCalled());
    (resolve.current.mutate.mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
    expect(notifications.notify.success).toHaveBeenCalledWith('Decisión registrada');
    expect(onClose).toHaveBeenCalled();
  });

  it('si la API rechaza la decisión muestra el motivo y no cierra', async () => {
    const onClose = open();
    fireEvent.click(screen.getByLabelText('Dar el envase de baja'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), { target: { value: 'No se puede dar de baja' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar decisión' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(resolve.current.mutate).toHaveBeenCalled());
    (resolve.current.mutate.mock.calls[0][1] as { onError: (e: unknown) => void }).onError(
      new Error('El caso ya está cerrado'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('El caso ya está cerrado');
    expect(onClose).not.toHaveBeenCalled();
  });
});
