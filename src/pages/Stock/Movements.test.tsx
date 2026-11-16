import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { movement } from '../../test/fixtures';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), locations: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/stock', () => ({
  useStockMovements: (...args: unknown[]) => state.list(...args) as unknown,
  useStockLocations: () => state.locations() as unknown,
}));

import { Movements } from './Movements';

state.locations.mockReturnValue(ok([]));

describeListStates({
  name: 'Libro de movimientos',
  url: '/stock/movements',
  page: <Movements />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([movement()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'Ana',
  emptyText: 'El libro está vacío',
  loadingLabel: 'Cargando movimientos',
});

describe('Movements', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.locations.mockReturnValue(ok([]));
  });

  it('la página va en la URL y un filtro vuelve a la primera', () => {
    state.list.mockReturnValue(ok(pageOf([movement()], 100)));
    renderPage(<Movements />, { url: '/stock/movements?page=4' });
    expect(state.list).toHaveBeenLastCalledWith({ page: 3, pageSize: 25 }, expect.anything());
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'delivery' } });
    expect(state.list).toHaveBeenLastCalledWith(
      { page: 0, pageSize: 25 },
      expect.objectContaining({ reason: 'delivery' }),
    );
  });

  it('con un filtro y sin resultados dice «Sin resultados», no «El libro está vacío»', () => {
    state.list.mockReturnValue(ok(pageOf([])));
    renderPage(<Movements />, { url: '/stock/movements?reason=delivery' });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByText('El libro está vacío')).not.toBeInTheDocument();
  });
});
