import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
}));
vi.mock('../../services/queries/stock', () => ({
  useAdjustments: (...args: unknown[]) => state.list(...args) as unknown,
}));
vi.mock('./components/AdjustmentFormModal', () => ({
  AdjustmentFormModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de ajuste</p> : null),
}));

import { Adjustments } from './Adjustments';

const AJUSTE = {
  adjustmentId: 'a-1',
  number: 7,
  location: { locationId: 'l-1', name: 'Galpón Central', kind: 'warehouse' },
  reason: 'shrinkage',
  notes: 'Se rompió una',
  batchId: 'b-1',
  createdByName: 'Ana',
  createdAt: '2026-10-10T12:00:00.000Z',
  items: [],
};

describeListStates({
  name: 'Ajustes',
  url: '/stock/adjustments',
  page: <Adjustments />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([AJUSTE])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'N° 7',
  emptyText: 'Todavía no hay ajustes',
  loadingLabel: 'Cargando ajustes',
});

describe('Adjustments', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.canWrite = true;
  });

  it('la página va en la URL: ?page=3 consulta la tercera', () => {
    state.list.mockReturnValue(ok(pageOf([AJUSTE], 40)));
    renderPage(<Adjustments />, { url: '/stock/adjustments?page=3' });
    expect(state.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }, expect.anything());
  });

  it('un filtro vuelve a la primera página', () => {
    state.list.mockReturnValue(ok(pageOf([AJUSTE], 40)));
    renderPage(<Adjustments />, { url: '/stock/adjustments?page=3' });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'leak' } });
    expect(state.list).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, expect.objectContaining({ reason: 'leak' }));
  });

  it('«Nuevo ajuste» abre el formulario sin mover la página', () => {
    state.list.mockReturnValue(ok(pageOf([AJUSTE], 40)));
    renderPage(<Adjustments />, { url: '/stock/adjustments?page=3' });
    fireEvent.click(screen.getByRole('button', { name: /Nuevo ajuste/ }));
    expect(screen.getByText('Formulario de ajuste')).toBeInTheDocument();
    expect(state.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }, expect.anything());
  });

  it('sin permiso de escritura el alta está deshabilitada', () => {
    state.canWrite = false;
    state.list.mockReturnValue(ok(pageOf([AJUSTE])));
    renderPage(<Adjustments />, { url: '/stock/adjustments' });
    expect(screen.getByRole('button', { name: /Nuevo ajuste/ })).toBeDisabled();
  });

  it('«Ver detalle» abre la ficha del ajuste', () => {
    state.list.mockReturnValue(ok(pageOf([AJUSTE])));
    renderPage(<Adjustments />, { url: '/stock/adjustments' });
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(screen.getByText('otra ruta')).toBeInTheDocument();
  });
});
