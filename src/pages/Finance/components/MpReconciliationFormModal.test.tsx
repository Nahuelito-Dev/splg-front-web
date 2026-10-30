import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn<[unknown, { onSuccess: (run: unknown) => void; onError: (e: unknown) => void }], void>(),
  navigate: vi.fn(),
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../services/queries/mpReconciliation', () => ({
  useCreateMpReconciliation: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('../../../utils/notifications', () => ({ notify: mocks.notify }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => mocks.navigate,
}));

import { MpReconciliationFormModal } from './MpReconciliationFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const open = (onClose = vi.fn()) =>
  render(
    <MemoryRouter>
      <MpReconciliationFormModal open onClose={onClose} />
    </MemoryRouter>,
  );

const fill = (from: string, to: string) => {
  fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: from } });
  fireEvent.change(screen.getByLabelText(/Hasta/), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: 'Pedir el reporte' }));
};

describe('MpReconciliationFormModal', () => {
  it('trae por omisión los últimos 30 días', async () => {
    open();

    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>(/Desde/).value).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    expect(screen.getByLabelText<HTMLInputElement>(/Hasta/).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no manda un rango de más de 31 días y lo explica', async () => {
    open();
    fill('2026-07-01', '2026-09-01');

    expect(await screen.findByText('El rango no puede pasar de 31 días')).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('no manda un rango al revés', async () => {
    open();
    fill('2026-09-10', '2026-09-01');

    expect(await screen.findByText('No puede ser anterior al inicio')).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('manda el rango, avisa y lleva a la corrida creada', async () => {
    const onClose = vi.fn();
    open(onClose);
    fill('2026-09-01', '2026-09-30');

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
    expect(mocks.mutate.mock.calls[0][0]).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    mocks.mutate.mock.calls[0][1].onSuccess({ reconciliationId: 'r-9' });
    expect(mocks.notify.success).toHaveBeenCalledWith('Pedimos el reporte a Mercado Pago');
    expect(onClose).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/finance/mp-reconciliation/r-9');
  });

  it('un error del back se muestra y el modal queda abierto', async () => {
    const onClose = vi.fn();
    open(onClose);
    fill('2026-09-01', '2026-09-30');
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());

    const error = new Error('Mercado Pago rechazó la credencial');
    mocks.mutate.mock.calls[0][1].onError(error);

    expect(mocks.notify.error).toHaveBeenCalledWith(error);
    expect(onClose).not.toHaveBeenCalled();
  });
});
