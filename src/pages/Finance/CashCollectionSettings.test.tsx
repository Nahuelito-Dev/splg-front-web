import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  settings: undefined as unknown,
  pending: undefined as unknown,
  update: undefined as unknown,
  settle: undefined as unknown,
  confirmed: true,
}));
vi.mock('../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../services/queries/finance', () => ({
  useCashBoxes: (_p: unknown, filters: { kind: string }) =>
    ok(
      pageOf(
        filters.kind === 'wallet'
          ? [{ cashBoxId: 'w-1', name: 'Mercado Pago' }]
          : [
              { cashBoxId: 'b-1', name: 'Banco Nación' },
              { cashBoxId: 'b-2', name: 'Banco Macro' },
            ],
      ),
    ),
}));
vi.mock('../../services/queries/cashSettings', () => ({
  useCashSettings: () => state.settings,
  usePendingCollections: () => state.pending,
  useUpdateCashSettings: () => state.update,
  useSettlePendingCollections: () => state.settle,
}));
const notifications = vi.hoisted(() => ({ success: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(state.confirmed),
  notify: notifications,
}));

import { CashCollectionSettings } from './CashCollectionSettings';

const settings = (over: Record<string, unknown> = {}) => ({
  mercadoPagoCashBoxId: null,
  mercadoPagoCashBoxName: null,
  transferCashBoxId: 'b-1',
  transferCashBoxName: 'Banco Nación',
  updatedAt: '2026-10-30T12:00:00.000Z',
  ...over,
});

const pending = (over: Record<string, unknown> = {}) => ({
  from: '2026-10-01T03:00:00.000Z',
  count: 3,
  amount: 45000,
  mercadoPago: { count: 2, amount: 30000 },
  transfer: { count: 1, amount: 15000 },
  deposits: { count: 0, amount: 0 },
  refunds: { count: 0, amount: 0 },
  oldestAt: '2026-10-02T12:00:00.000Z',
  ...over,
});

const setup = (data = settings(), pendientes = pending()) => {
  state.settings = ok(data);
  state.pending = ok(pendientes);
  state.update = mutation();
  state.settle = mutation();
  renderPage(<CashCollectionSettings />, { url: '/finance/collection-settings' });
  return { update: state.update as ReturnType<typeof mutation>, settle: state.settle as ReturnType<typeof mutation> };
};

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  state.confirmed = true;
  vi.clearAllMocks();
});

describe('CashCollectionSettings', () => {
  it('muestra las cajas vigentes y el aviso de cobros sin asentar', () => {
    setup();
    expect(screen.getByLabelText('Caja de transferencias')).toHaveValue('b-1');
    expect(screen.getByLabelText('Caja de Mercado Pago')).toHaveValue('');
    expect(screen.getByText(/Hay 3 movimientos de ventas sin asentar desde el/)).toBeInTheDocument();
  });

  it('guarda las dos cajas; «sin caja» manda null', () => {
    const { update } = setup();
    const guardar = screen.getByRole('button', { name: 'Guardar cajas' });
    expect(guardar).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Caja de Mercado Pago'), { target: { value: 'w-1' } });
    fireEvent.change(screen.getByLabelText('Caja de transferencias'), { target: { value: '' } });
    fireEvent.click(guardar);
    expect(update.mutate).toHaveBeenCalledWith(
      { mercadoPagoCashBoxId: 'w-1', transferCashBoxId: null },
      expect.anything(),
    );
  });

  it('asienta los pendientes con la fecha elegida, previa confirmación, e informa el resultado', async () => {
    const { settle } = setup(settings({ mercadoPagoCashBoxId: 'w-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Asentar cobros pendientes' }));
    await waitFor(() => expect(settle.mutate).toHaveBeenCalledTimes(1));
    const [body, options] = settle.mutate.mock.calls[0] as [{ from: string }, { onSuccess: (r: unknown) => void }];
    expect(body.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    options.onSuccess({ settled: 3, alreadySettled: 0, withoutCashBox: 0, failed: 0 });
    expect(notifications.success).toHaveBeenCalledWith('3 cobros asentados');
    options.onSuccess({ settled: 2, alreadySettled: 0, withoutCashBox: 0, failed: 1 });
    expect(notifications.warn).toHaveBeenCalled();
  });

  it('si no se confirma, no asienta nada', async () => {
    state.confirmed = false;
    const { settle } = setup(settings({ mercadoPagoCashBoxId: 'w-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Asentar cobros pendientes' }));
    await Promise.resolve();
    expect(settle.mutate).not.toHaveBeenCalled();
  });

  it('sin la caja del medio de los cobros pendientes no se puede asentar', () => {
    setup(settings({ transferCashBoxId: null }), pending({ transfer: { count: 0, amount: 0 }, count: 2 }));
    expect(screen.getByRole('button', { name: 'Asentar cobros pendientes' })).toBeDisabled();
    expect(screen.getByText(/Elegí y guardá la caja del medio/)).toBeInTheDocument();
  });

  it('sin permiso de escritura todo queda deshabilitado', () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Solo lectura' };
    setup(settings({ mercadoPagoCashBoxId: 'w-1' }));
    expect(screen.getByLabelText('Caja de Mercado Pago')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Asentar cobros pendientes' })).toBeDisabled();
  });

  it('el administrador general sin «Ver como» no ve el formulario', () => {
    state.perms = { needsDistributor: true, canWrite: true, writeHint: undefined };
    setup();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Caja de Mercado Pago')).not.toBeInTheDocument();
  });
});
