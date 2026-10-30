import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined, isSuperAdmin: false },
  run: undefined as unknown,
  apply: undefined as unknown,
  report: undefined as unknown,
  confirmed: true,
}));

vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => state.perms,
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/finance', () => ({
  useCashBoxOptions: () =>
    ok(
      pageOf([
        { cashBoxId: 'w-1', name: 'Mercado Pago' },
        { cashBoxId: 'b-1', name: 'Banco Nación' },
      ]),
    ),
}));
vi.mock('../../services/queries/cashSettings', () => ({
  useCashSettings: () => ok({ mercadoPagoCashBoxId: 'w-1' }),
}));
vi.mock('../../services/queries/mpReconciliation', () => ({
  useMpReconciliation: () => state.run,
  useApplyMpReconciliation: () => state.apply,
  useMpReconciliationReport: () => state.report,
}));
const notifications = vi.hoisted(() => ({ success: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(state.confirmed),
  notify: notifications,
}));
const files = vi.hoisted(() => ({ open: vi.fn(() => true), save: vi.fn() }));
vi.mock('../../utils/fileSource', () => ({ openFileSource: files.open, saveFileSource: files.save }));

import { MpReconciliationDetails } from './MpReconciliationDetails';

const item = (over: Record<string, unknown> = {}) => ({
  itemId: 'i-1',
  kind: 'payment_not_in_cash',
  sourceId: 'MP-596254552',
  paymentId: 'p-1',
  orderId: null,
  occurredAt: '2026-09-08T13:00:00.000Z',
  mpDescription: 'payment',
  mpAmount: 10300,
  ledgerAmount: null,
  difference: null,
  extraAmount: 500,
  direction: 'in',
  appliable: true,
  needsCashBox: false,
  accountLevel: false,
  note: 'Mercado Pago cobró y la caja no tiene el ingreso.',
  status: 'pending',
  appliedAt: null,
  appliedMovementId: null,
  ...over,
});

const run = (over: Record<string, unknown> = {}) => ({
  reconciliationId: 'r-1',
  distributorId: 'dist-1',
  from: '2026-09-01',
  to: '2026-09-30',
  status: 'ready',
  failureReason: null,
  statusNote: null,
  summary: {
    rows: 3,
    mp: { gross: 43100, fees: 2500, taxes: 300, net: 40300 },
    cash: { income: 0, expense: 0, net: 0 },
    differences: { payment_not_in_cash: 1 },
    alreadyApplied: 2,
    unreadableRows: 0,
    account: { rows: 3, credit: 475, debit: 40120 },
  },
  hasReport: true,
  readyAt: '2026-10-30T20:00:00.000Z',
  lastCheckedAt: null,
  createdAt: '2026-10-30T19:59:00.000Z',
  includesAccountLevel: false,
  items: [item()],
  ...over,
});

const setup = (data = run()) => {
  state.run = ok(data);
  state.apply = mutation();
  state.report = mutation();
  renderPage(<MpReconciliationDetails />, {
    url: '/finance/mp-reconciliation/r-1',
    path: '/finance/mp-reconciliation/:id',
  });
  return { apply: state.apply as ReturnType<typeof mutation>, report: state.report as ReturnType<typeof mutation> };
};

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined, isSuperAdmin: false };
  state.confirmed = true;
  vi.clearAllMocks();
});

describe('MpReconciliationDetails', () => {
  it('mientras carga y si falla la consulta dice lo que pasa', () => {
    state.run = loading();
    renderPage(<MpReconciliationDetails />, {
      url: '/finance/mp-reconciliation/r-1',
      path: '/finance/mp-reconciliation/:id',
    });
    expect(screen.queryByText('Esperando el reporte de Mercado Pago')).not.toBeInTheDocument();
    cleanup();

    const refetch = vi.fn();
    state.run = failed(refetch);
    renderPage(<MpReconciliationDetails />, {
      url: '/finance/mp-reconciliation/r-1',
      path: '/finance/mp-reconciliation/:id',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('si Mercado Pago todavía no armó el reporte, lo avisa y no muestra diferencias', () => {
    setup(
      run({
        status: 'requested',
        summary: null,
        items: [],
        lastCheckedAt: '2026-10-30T20:01:00.000Z',
        statusNote: 'Mercado Pago todavía no generó el reporte: se vuelve a consultar solo.',
      }),
    );

    expect(screen.getByText('Esperando el reporte de Mercado Pago')).toBeInTheDocument();
    expect(screen.getByText(/todavía no generó el reporte/)).toBeInTheDocument();
    expect(screen.getByText(/Última consulta/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Asentar/ })).not.toBeInTheDocument();
  });

  it('si la conciliación falló, muestra el motivo', () => {
    setup(
      run({
        status: 'failed',
        summary: null,
        items: [],
        failureReason: 'Mercado Pago rechazó la credencial del servidor',
      }),
    );

    expect(screen.getByText('No se pudo conciliar')).toBeInTheDocument();
    expect(screen.getByText('Mercado Pago rechazó la credencial del servidor')).toBeInTheDocument();
  });

  it('lista, sin diferencias: dice que la caja coincide', () => {
    setup(run({ items: [] }));

    expect(screen.getByText('La caja coincide con Mercado Pago')).toBeInTheDocument();
  });

  it('muestra el neto de Mercado Pago frente al de la caja y las diferencias agrupadas por tipo', () => {
    setup();

    expect(screen.getByText('Neto según Mercado Pago')).toBeInTheDocument();
    expect(screen.getByText('Cobros sin ingreso en la caja (1)')).toBeInTheDocument();
    expect(screen.getByText('MP-596254552')).toBeInTheDocument();
    expect(screen.getByText(/Mercado Pago \$.*10\.300,00/)).toBeInTheDocument();
  });

  it('lo de la cuenta sólo se muestra al administrador general', () => {
    setup();
    expect(screen.queryByText(/que no son de una distribuidora/)).not.toBeInTheDocument();
    cleanup();

    state.perms = { ...state.perms, isSuperAdmin: true };
    setup();
    expect(screen.getByText(/que no son de una distribuidora/)).toBeInTheDocument();
  });

  it('marcar una diferencia y asentar la manda con la confirmación; una sola vez', async () => {
    const { apply } = setup();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Elegir la diferencia MP-596254552' }));
    expect(screen.getByText('1 diferencia seleccionado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Asentar lo elegido' }));

    await waitFor(() => expect(apply.mutate).toHaveBeenCalledTimes(1));
    expect(apply.mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: { items: [{ itemId: 'i-1' }] } });
  });

  it('si no se confirma, no se asienta nada', async () => {
    state.confirmed = false;
    const { apply } = setup();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Elegir la diferencia MP-596254552' }));
    fireEvent.click(screen.getByRole('button', { name: 'Asentar lo elegido' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Asentar lo elegido' })).toBeEnabled());
    expect(apply.mutate).not.toHaveBeenCalled();
  });

  it('«Marcar todas» marca las asentables del grupo y «Quitar todas» las suelta', () => {
    setup(
      run({ items: [item(), item({ itemId: 'i-2', sourceId: 'MP-2' }), item({ itemId: 'i-3', status: 'applied' })] }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas' }));
    expect(screen.getByText('2 diferencias seleccionados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar todas' }));
    expect(screen.queryByText(/seleccionados/)).not.toBeInTheDocument();
  });

  it('lo informativo y lo ya asentado no tiene casilla', () => {
    setup(
      run({
        items: [
          item({ itemId: 'i-4', kind: 'amount_mismatch', appliable: false, sourceId: 'MP-4' }),
          item({ itemId: 'i-5', status: 'applied', sourceId: 'MP-5' }),
        ],
      }),
    );

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByText('Asentada')).toBeInTheDocument();
  });

  it('un retiro pide la caja de destino (sin la billetera de Mercado Pago) antes de asentar', async () => {
    state.perms = { ...state.perms, isSuperAdmin: true };
    const { apply } = setup(
      run({
        items: [
          item({
            itemId: 'i-9',
            kind: 'payout',
            sourceId: '9001',
            needsCashBox: true,
            accountLevel: true,
            mpAmount: 39997,
            extraAmount: 3,
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Elegir la diferencia 9001' }));
    const select = screen.getByLabelText('Caja que recibió el retiro');
    expect(within(select).queryByRole('option', { name: 'Mercado Pago' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Asentar lo elegido' }));
    await waitFor(() => expect(notifications.warn).toHaveBeenCalled());
    expect(apply.mutate).not.toHaveBeenCalled();

    fireEvent.change(select, { target: { value: 'b-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Asentar lo elegido' }));
    await waitFor(() => expect(apply.mutate).toHaveBeenCalledTimes(1));
    expect(apply.mutate.mock.calls[0][0]).toEqual({
      id: 'r-1',
      body: { items: [{ itemId: 'i-9', cashBoxId: 'b-1' }], distributorId: 'dist-1' },
    });
  });

  it('el resultado se avisa y lo que la caja rechazó queda marcado con su motivo, listo para reintentar', async () => {
    const { apply } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Elegir la diferencia MP-596254552' }));
    fireEvent.click(screen.getByRole('button', { name: 'Asentar lo elegido' }));
    await waitFor(() => expect(apply.mutate).toHaveBeenCalled());

    const options = apply.mutate.mock.calls[0][1] as { onSuccess: (result: unknown) => void };
    options.onSuccess({
      applied: 0,
      alreadyApplied: 0,
      failed: 1,
      results: [{ itemId: 'i-1', outcome: 'failed', message: 'La caja está desactivada', movementId: null }],
    });

    await waitFor(() => expect(screen.getByText(/La caja está desactivada/)).toBeInTheDocument());
    expect(notifications.warn).toHaveBeenCalledWith('0 ajustes asentados; 1 no se pudo asentar');
    expect(screen.getByRole('checkbox', { name: 'Elegir la diferencia MP-596254552' })).toBeChecked();
  });

  it('bajar el reporte pide el enlace firmado y lo abre', () => {
    const { report } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Bajar el reporte' }));

    expect(report.mutate).toHaveBeenCalledTimes(1);
    expect(report.mutate.mock.calls[0][0]).toBe('r-1');
    const options = report.mutate.mock.calls[0][1] as { onSuccess: (link: unknown) => void };
    options.onSuccess({ url: 'https://s3/reporte.csv', expiresAt: null, requiresAuth: false });
    expect(files.open).toHaveBeenCalledWith({ kind: 'url', url: 'https://s3/reporte.csv', expiresAt: null });
  });

  it('sin reporte guardado no hay botón de bajarlo', () => {
    setup(run({ hasReport: false }));

    expect(screen.queryByRole('button', { name: 'Bajar el reporte' })).not.toBeInTheDocument();
  });

  it('sin distribuidora elegida el administrador general no puede asentar', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí una distribuidora', isSuperAdmin: true };
    setup();

    expect(screen.getByText(/Elegí una distribuidora con «Ver como»/)).toBeInTheDocument();
  });
});
