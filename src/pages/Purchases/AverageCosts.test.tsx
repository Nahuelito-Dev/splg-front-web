import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, failed, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/purchases', () => ({ useAverageCosts: () => state.query() as unknown }));

import { AverageCosts } from './AverageCosts';

const COSTO = {
  gasCylinderId: 'g-1',
  gasCylinderType: '10kg',
  averageUnitCost: 5200.5,
  lastUnitCost: 5300,
  lastReceivedAt: '2026-10-10T12:00:00.000Z',
  fullOnHand: 14,
};

describeListStates({
  name: 'Costo promedio',
  url: '/purchases/costs',
  page: <AverageCosts />,
  setResult: (result) => state.query.mockReturnValue(result),
  withRow: () => ok([COSTO]),
  withoutRows: () => ok([]),
  rowText: '10kg',
  emptyText: 'Sin garrafas en el catálogo',
  loadingLabel: 'Cargando costos',
});

describe('AverageCosts', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('muestra las llenas en existencia', () => {
    state.query.mockReturnValue(ok([COSTO]));
    renderPage(<AverageCosts />, { url: '/purchases/costs' });
    expect(screen.getByText(/14 llenas en existencia/)).toBeInTheDocument();
  });

  it('el error reintenta la consulta', () => {
    const refetch = vi.fn();
    state.query.mockReturnValue(failed(refetch));
    renderPage(<AverageCosts />, { url: '/purchases/costs' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
