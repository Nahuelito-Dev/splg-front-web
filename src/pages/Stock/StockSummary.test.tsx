import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ summary: vi.fn(), balances: vi.fn(), thresholds: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true }),
}));
vi.mock('../../common/components/ImportWizard/ImportWizard', () => ({
  ImportWizard: ({ resource }: { resource: string }) => <div role="dialog" aria-label={`Importar ${resource}`} />,
}));
vi.mock('../../services/queries/stock', () => ({
  useStockSummary: () => state.summary() as unknown,
  useStockBalances: () => state.balances() as unknown,
  useThresholds: () => state.thresholds() as unknown,
}));

import { StockSummary } from './StockSummary';

const SUMMARY = [
  {
    gasCylinderId: 'g-1',
    gasCylinderType: '10kg',
    warehouses: { full: 8, empty: 3, defective: 1 },
    vehicles: { full: 2, empty: 1, defective: 0 },
    physicalFull: 10,
    reserved: 2,
    sellable: 8,
    minimumFull: 12,
  },
];
const BALANCES = [
  {
    locationId: 'l-1',
    locationName: 'Galpón Central',
    locationKind: 'warehouse',
    warehouseId: 'w-1',
    carId: null,
    gasCylinderId: 'g-1',
    gasCylinderType: '10kg',
    condition: 'full',
    quantity: 8,
    updatedAt: '2026-10-12T00:00:00.000Z',
  },
];
const LOW = {
  thresholdId: 't-1',
  warehouseId: 'w-1',
  warehouseName: 'Galpón Central',
  gasCylinderId: 'g-1',
  gasCylinderType: '10kg',
  minFull: 12,
  currentFull: 8,
  alertedAt: null,
};

const happy = () => {
  state.summary.mockReturnValue(ok(SUMMARY));
  state.balances.mockReturnValue(ok(BALANCES));
  state.thresholds.mockReturnValue(ok([]));
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StockSummary', () => {
  it('muestra el vendible y el stock por ubicación', () => {
    happy();
    renderPage(<StockSummary />, { url: '/stock' });
    expect(screen.getAllByText('Vendible').length).toBeGreaterThan(0);
    expect(screen.getByText('8 llenas · 0 vacías · 0 defectuosas')).toBeInTheDocument();
    // El resumen tiene una fila por tipo de garrafa: el conteo cuenta tipos, no garrafas.
    const count = (pattern: RegExp) => (_: string, el: Element | null) =>
      el?.tagName === 'P' && pattern.test(el.textContent ?? '');
    expect(screen.getByText(count(/^\d+ tipos? de garrafa$/))).toBeInTheDocument();
    expect(screen.queryByText(count(/^\d+ garrafas?$/))).toBeNull();
  });

  it('sin saldos lo dice y ofrece ir a los galpones', () => {
    happy();
    state.balances.mockReturnValue(ok([]));
    renderPage(<StockSummary />, { url: '/stock' });
    fireEvent.click(screen.getByRole('button', { name: 'Ir a galpones' }));
    expect(screen.getByText('otra ruta')).toBeInTheDocument();
  });

  it('un mínimo no alcanzado avisa «Stock bajo»', () => {
    happy();
    state.thresholds.mockReturnValue(ok([LOW]));
    renderPage(<StockSummary />, { url: '/stock' });
    expect(screen.getByRole('alert')).toHaveTextContent('Stock bajo');
  });

  it('si fallan los mínimos no afirma que no hay alertas: lo dice y permite reintentar', () => {
    happy();
    const refetch = vi.fn();
    state.thresholds.mockReturnValue(failed(refetch));
    renderPage(<StockSummary />, { url: '/stock' });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron consultar los mínimos');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error del resumen se dice con Reintentar', () => {
    happy();
    const refetch = vi.fn();
    state.summary.mockReturnValue(failed(refetch));
    renderPage(<StockSummary />, { url: '/stock' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('StockSummary: importación', () => {
  it('el menú «Más» ofrece importar stock y abre el asistente', async () => {
    happy();
    renderPage(<StockSummary />, { url: '/stock' });
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Importar stock' }));
    expect(await screen.findByRole('dialog', { name: 'Importar stock' })).toBeInTheDocument();
  });
});
