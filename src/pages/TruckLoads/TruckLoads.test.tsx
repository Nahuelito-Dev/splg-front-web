import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSummary } from '../../test/fixtures';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
}));
vi.mock('../../services/queries/truckLoads', () => ({
  useTruckLoads: (...args: unknown[]) => state.list(...args) as unknown,
}));
vi.mock('../Stock/components/useStockOptions', () => ({
  useCarOptions: () => ({ options: [], failed: false }),
  useDriverOptions: () => ({ options: [], failed: false }),
}));
vi.mock('./components/OpenTruckLoadModal', () => ({
  OpenTruckLoadModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de carga</p> : null),
}));
vi.mock('./components/TruckStockCard', () => ({ TruckStockCard: () => null }));

import { TruckLoads } from './TruckLoads';

describeListStates({
  name: 'Cargas del camión',
  url: '/truck-loads',
  page: <TruckLoads />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([loadSummary()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'N° 33 · AB123CD',
  emptyText: 'Todavía no hay cargas',
  loadingLabel: 'Cargando cargas',
});

describe('TruckLoads', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.canWrite = true;
  });

  it('«Abrir carga» abre el formulario', () => {
    state.list.mockReturnValue(ok(pageOf([loadSummary()])));
    renderPage(<TruckLoads />, { url: '/truck-loads' });
    fireEvent.click(screen.getByRole('button', { name: /Abrir carga|Nueva carga|Nueva/ }));
    expect(screen.getByText('Formulario de carga')).toBeInTheDocument();
  });

  it('la página y el estado van en la URL', () => {
    state.list.mockReturnValue(ok(pageOf([loadSummary()], 45)));
    renderPage(<TruckLoads />, { url: '/truck-loads?page=3&status=on_route' });
    expect(state.list).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 10 },
      expect.objectContaining({ status: 'on_route' }),
    );
  });

  it('«Ver detalle» abre la ficha de la carga', () => {
    state.list.mockReturnValue(ok(pageOf([loadSummary()])));
    renderPage(<TruckLoads />, { url: '/truck-loads' });
    fireEvent.click(screen.getByRole('button', { name: 'Ver carga' }));
    expect(screen.getByText('otra ruta')).toBeInTheDocument();
  });
});
