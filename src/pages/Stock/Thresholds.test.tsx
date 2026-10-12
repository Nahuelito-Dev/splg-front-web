import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ warehouses: vi.fn(), thresholds: vi.fn(), save: vi.fn(), cylinders: vi.fn() }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../services/queries/stock', () => ({
  useWarehouses: () => state.warehouses() as unknown,
  useThresholds: () => state.thresholds() as unknown,
  useUpsertThresholds: () => state.save() as unknown,
}));
vi.mock('./components/useStockOptions', () => ({ useCylinderOptions: () => state.cylinders() as unknown }));

import { Thresholds } from './Thresholds';

const CYL = {
  options: [{ value: 'g-1', label: '10kg' }],
  failed: false,
  loading: false,
  error: null,
  refetch: vi.fn(),
};
const WH = [{ warehouseId: 'w-1', name: 'Galpón Central' }];
const THRESHOLD = {
  thresholdId: 't-1',
  warehouseId: 'w-1',
  warehouseName: 'Galpón Central',
  gasCylinderId: 'g-1',
  gasCylinderType: '10kg',
  minFull: 10,
  currentFull: 4,
  alertedAt: null,
};

const happy = () => {
  state.warehouses.mockReturnValue(ok(WH));
  state.thresholds.mockReturnValue(ok([THRESHOLD]));
  state.cylinders.mockReturnValue(CYL);
  state.save.mockReturnValue(mutation());
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Thresholds', () => {
  it('muestra el mínimo de cada par y avisa el stock bajo', () => {
    happy();
    renderPage(<Thresholds />, { url: '/stock/thresholds' });
    expect(screen.getByText('4 llenas ahora')).toBeInTheDocument();
    expect(screen.getByText('Stock bajo')).toBeInTheDocument();
    expect(screen.getByLabelText('Mínimo de llenas de 10kg en Galpón Central')).toHaveValue(10);
  });

  it('sin cambios el guardado está apagado; al editar manda sólo lo que cambió', () => {
    happy();
    const save = mutation();
    state.save.mockReturnValue(save);
    renderPage(<Thresholds />, { url: '/stock/thresholds' });
    const button = screen.getByRole('button', { name: 'Guardar mínimos' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mínimo de llenas de 10kg en Galpón Central'), { target: { value: '12' } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(save.mutate.mock.calls[0][0]).toEqual({
      thresholds: [{ warehouseId: 'w-1', gasCylinderId: 'g-1', minFull: 12 }],
    });
  });

  it('un valor inválido se marca y no deja guardar', () => {
    happy();
    renderPage(<Thresholds />, { url: '/stock/thresholds' });
    fireEvent.change(screen.getByLabelText('Mínimo de llenas de 10kg en Galpón Central'), { target: { value: '-3' } });
    expect(screen.getByRole('button', { name: 'Guardar mínimos' })).toBeDisabled();
  });

  it('sin galpones lo dice', () => {
    happy();
    state.warehouses.mockReturnValue(ok([]));
    renderPage(<Thresholds />, { url: '/stock/thresholds' });
    expect(screen.getByText('Faltan galpones o garrafas')).toBeInTheDocument();
  });

  it('un error de cualquier consulta se dice con Reintentar y reintenta todas', () => {
    happy();
    const refetch = vi.fn();
    state.thresholds.mockReturnValue(failed(refetch));
    renderPage(<Thresholds />, { url: '/stock/thresholds' });
    expect(screen.queryByText('Faltan galpones o garrafas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra el listado', () => {
    happy();
    state.warehouses.mockReturnValue(loading());
    renderPage(<Thresholds />, { url: '/stock/thresholds' });
    expect(screen.queryByText('Galpón Central')).not.toBeInTheDocument();
  });
});
