import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { movement } from '../../test/fixtures';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), reversed: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
}));
vi.mock('../../services/queries/stock', () => ({
  useStockMovements: (...args: unknown[]) => state.list(...args) as unknown,
  useBatchReversed: (...args: unknown[]) => state.reversed(...args) as unknown,
}));
vi.mock('./components/TransferFormModal', () => ({ TransferFormModal: () => null }));
vi.mock('./components/ReverseBatchModal', () => ({
  ReverseBatchModal: ({ batchId }: { batchId: string | null }) => (batchId ? <p>Contraasentar {batchId}</p> : null),
}));

import { Transfers } from './Transfers';

state.reversed.mockReturnValue(ok(false));

describeListStates({
  name: 'Transferencias',
  url: '/stock/transfers',
  page: <Transfers />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([movement()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'Galpón Central → Camión AB123CD',
  emptyText: 'Todavía no hay transferencias',
  loadingLabel: 'Cargando transferencias',
});

describe('Transfers', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.canWrite = true;
    state.reversed.mockReturnValue(ok(false));
  });

  it('el lote sin contraasiento ofrece «Contraasentar lote» y abre el modal con su id', () => {
    state.list.mockReturnValue(ok(pageOf([movement()])));
    renderPage(<Transfers />, { url: '/stock/transfers' });
    expect(state.reversed).toHaveBeenCalledWith('b-1');
    fireEvent.click(screen.getByRole('button', { name: 'Contraasentar lote' }));
    expect(screen.getByText('Contraasentar b-1')).toBeInTheDocument();
  });

  it('el lote ya contraasentado lo dice y no ofrece contraasentar otra vez', () => {
    state.reversed.mockReturnValue(ok(true));
    state.list.mockReturnValue(ok(pageOf([movement()])));
    renderPage(<Transfers />, { url: '/stock/transfers' });
    expect(screen.getByText('Contraasentada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contraasentar lote' })).not.toBeInTheDocument();
  });

  it('mientras no se sabe si ya se contraasentó no se ofrece nada', () => {
    state.reversed.mockReturnValue({ ...ok(undefined), isSuccess: false, isPending: true });
    state.list.mockReturnValue(ok(pageOf([movement()])));
    renderPage(<Transfers />, { url: '/stock/transfers' });
    expect(screen.queryByRole('button', { name: 'Contraasentar lote' })).not.toBeInTheDocument();
    expect(screen.queryByText('Contraasentada')).not.toBeInTheDocument();
  });

  it('sin permiso de escritura no se puede contraasentar', () => {
    state.canWrite = false;
    state.list.mockReturnValue(ok(pageOf([movement()])));
    renderPage(<Transfers />, { url: '/stock/transfers' });
    expect(screen.queryByRole('button', { name: 'Contraasentar lote' })).not.toBeInTheDocument();
  });

  it('la página va en la URL', () => {
    state.list.mockReturnValue(ok(pageOf([movement()], 30)));
    renderPage(<Transfers />, { url: '/stock/transfers?page=2' });
    expect(state.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }, { reason: 'transfer' });
  });
});
