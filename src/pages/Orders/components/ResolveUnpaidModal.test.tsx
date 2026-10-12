import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MutateVars {
  id: string;
  body: { resolution: string; note: string };
  idempotencyKey: string;
}
interface MutateOptions {
  onSuccess: (result: { alreadyResolved: boolean }) => void;
  onError: (error: Error) => void;
}
const pending = vi.hoisted(() => ({ value: false }));
const mutate = vi.hoisted(() => vi.fn<[MutateVars, MutateOptions], void>());
const notifySuccess = vi.hoisted(() => vi.fn());
const notifyError = vi.hoisted(() => vi.fn());
const notifyInfo = vi.hoisted(() => vi.fn());

vi.mock('../../../services/queries/orders', () => ({ useResolveUnpaid: () => ({ mutate, isPending: pending.value }) }));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: notifySuccess, error: notifyError, info: notifyInfo },
}));

import { ResolveUnpaidModal } from './ResolveUnpaidModal';

const ORDER = { order_id: 'aaaaaaaa-1111', total_amount: 12500 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const renderModal = (onClose = vi.fn()) => render(<ResolveUnpaidModal open onClose={onClose} order={ORDER} />);

beforeEach(() => {
  pending.value = false;
  mutate.mockReset();
  notifySuccess.mockReset();
  notifyError.mockReset();
  notifyInfo.mockReset();
});
afterEach(cleanup);

describe('ResolveUnpaidModal', () => {
  it('ofrece las dos resoluciones y pide la nota antes de mandar nada', () => {
    renderModal();
    expect(screen.getByRole('radio', { name: /Lo cobramos después/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Dar por perdido/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    expect(screen.getByText('Elegí cómo se resolvió')).toBeInTheDocument();
    expect(screen.getByText(/Escribí la nota/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('una nota en blanco no alcanza', () => {
    renderModal();
    fireEvent.click(screen.getByRole('radio', { name: /Lo cobramos después/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('«Lo cobramos después» manda paid con la nota, y una Idempotency-Key UUID', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('radio', { name: /Lo cobramos después/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: ' Transfirió al día siguiente ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    const [vars, options] = mutate.mock.calls[0];
    expect(vars).toMatchObject({
      id: 'aaaaaaaa-1111',
      body: { resolution: 'paid', note: 'Transfirió al día siguiente' },
    });
    expect(vars.idempotencyKey).toMatch(UUID);
    options.onSuccess({ alreadyResolved: false });
    expect(notifySuccess).toHaveBeenCalledWith('Cobro registrado');
    expect(onClose).toHaveBeenCalled();
  });

  it('«Dar por perdido» cambia el botón y manda written_off', () => {
    renderModal();
    fireEvent.click(screen.getByRole('radio', { name: /Dar por perdido/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'No atiende' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pérdida' }));
    expect(mutate.mock.calls[0][0].body).toEqual({ resolution: 'written_off', note: 'No atiende' });
  });

  it('un reintento del mismo envío reusa la clave; cambiar lo que se manda la renueva', () => {
    renderModal();
    fireEvent.click(screen.getByRole('radio', { name: /Lo cobramos después/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Pagó' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    expect(mutate.mock.calls[1][0].idempotencyKey).toBe(mutate.mock.calls[0][0].idempotencyKey);

    fireEvent.click(screen.getByRole('radio', { name: /Dar por perdido/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pérdida' }));
    expect(mutate.mock.calls[2][0].idempotencyKey).not.toBe(mutate.mock.calls[0][0].idempotencyKey);
  });

  it('muestra el error del back (409 si ya se resolvió) y deja el modal abierto', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('radio', { name: /Lo cobramos después/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Pagó' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    const error = new Error('El pedido no tiene el pago informado como impago');
    mutate.mock.calls[0][1].onError(error);
    expect(notifyError).toHaveBeenCalledWith(error);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('mientras se envía el botón queda bloqueado: no hay doble envío', () => {
    pending.value = true;
    renderModal();
    fireEvent.click(screen.getByRole('radio', { name: /Lo cobramos después/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Pagó' } });
    const button = screen.getByRole('button', { name: 'Confirmar cobro' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('si otro administrador ya lo había resuelto avisa eso y no «lo resolviste»', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('radio', { name: /Lo cobramos después/ }));
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Pagó' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    mutate.mock.calls[0][1].onSuccess({ alreadyResolved: true });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Otro administrador ya lo había resuelto'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
