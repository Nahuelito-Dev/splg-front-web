import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  list: undefined as unknown,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => state.perms,
}));
vi.mock('../../services/queries/mpReconciliation', () => ({
  useMpReconciliations: () => state.list,
  useMpReconciliationStatusCounts: () => ({ all: 2, requested: 1, ready: 1, failed: 0 }),
}));
vi.mock('./components/MpReconciliationFormModal', () => ({
  MpReconciliationFormModal: ({ open }: { open: boolean }) => (open ? <p>Modal de nueva conciliación</p> : null),
}));

import { MpReconciliations } from './MpReconciliations';

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
    differences: { payment_not_in_cash: 3, tax_withholding: 1 },
    differenceCount: 4,
    netGap: 40300,
    alreadyApplied: 0,
    unreadableRows: 0,
  },
  hasReport: true,
  readyAt: '2026-10-30T20:00:00.000Z',
  lastCheckedAt: null,
  createdAt: '2026-10-30T19:59:00.000Z',
  includesAccountLevel: false,
  ...over,
});

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  vi.clearAllMocks();
});

describeListStates({
  name: 'Conciliaciones con Mercado Pago',
  url: '/finance/mp-reconciliation',
  page: <MpReconciliations />,
  setResult: (r) => {
    state.list = r;
  },
  withRow: () => ok(pageOf([run()])),
  withoutRows: () => ok(pageOf([])),
  rowText: '4 diferencias',
  emptyText: 'Todavía no conciliaste con Mercado Pago',
  loadingLabel: 'Cargando conciliaciones',
});

describe('MpReconciliations', () => {
  it('cada estado dice lo que pasa: espera, falló o sin diferencias', () => {
    state.list = ok(
      pageOf([
        run({ reconciliationId: 'a', status: 'requested', summary: null }),
        run({ reconciliationId: 'b', status: 'failed', summary: null, failureReason: 'Credencial rechazada' }),
        run({
          reconciliationId: 'c',
          summary: {
            rows: 1,
            mp: { gross: 0, fees: 0, taxes: 0, net: 0 },
            cash: { income: 0, expense: 0, net: 0 },
            differences: {},
            differenceCount: 0,
            netGap: 0,
            alreadyApplied: 0,
            unreadableRows: 0,
          },
        }),
      ]),
    );
    renderPage(<MpReconciliations />, { url: '/finance/mp-reconciliation' });

    expect(screen.getByText('Esperando el reporte')).toBeInTheDocument();
    expect(screen.getByText('Credencial rechazada')).toBeInTheDocument();
    expect(screen.getByText('Sin diferencias')).toBeInTheDocument();
  });

  it('muestra el total de diferencias que manda el back, no una suma del panel', () => {
    state.list = ok(
      pageOf([
        run({
          summary: {
            ...run().summary,
            differences: { payment_not_in_cash: 1 },
            differenceCount: 7,
          },
        }),
      ]),
    );
    renderPage(<MpReconciliations />, { url: '/finance/mp-reconciliation' });

    expect(screen.getByText('7 diferencias')).toBeInTheDocument();
  });

  it('«Nueva conciliación» abre el pedido del rango', () => {
    state.list = ok(pageOf([]));
    renderPage(<MpReconciliations />, { url: '/finance/mp-reconciliation' });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva conciliación' }));

    expect(screen.getByText('Modal de nueva conciliación')).toBeInTheDocument();
  });

  it('el administrador general sin «Ver como» no puede pedirla y se le dice por qué', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí una distribuidora con «Ver como»' };
    state.list = ok(pageOf([]));
    renderPage(<MpReconciliations />, { url: '/finance/mp-reconciliation' });

    expect(screen.getByRole('button', { name: 'Nueva conciliación' })).toBeDisabled();
    expect(screen.getByText(/Elegí una distribuidora con «Ver como» para ver/)).toBeInTheDocument();
  });
});
