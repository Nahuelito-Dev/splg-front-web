import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  summary: vi.fn(),
  balances: vi.fn(),
  thresholds: vi.fn(),
  warehouse: vi.fn(),
  count: vi.fn(),
  report: vi.fn(),
  reapply: vi.fn(),
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../common/components/ImportWizard/ImportWizard', () => ({ ImportWizard: () => null }));
vi.mock('../../services/queries/stock', () => ({
  useStockSummary: () => state.summary() as unknown,
  useStockBalances: () => state.balances() as unknown,
  useThresholds: () => state.thresholds() as unknown,
  useWarehouse: () => state.warehouse() as unknown,
  useInitialCount: () => state.count() as unknown,
  useUpdateWarehouse: () => mutation(),
  useReconciliation: () => state.report() as unknown,
  useReapplyDeliveries: () => state.reapply() as unknown,
}));
vi.mock('./components/WarehouseFormModal', () => ({ WarehouseFormModal: () => null }));
vi.mock('./components/InitialCountModal', () => ({ InitialCountModal: () => null }));
vi.mock('./components/ReconciliationAdjustModal', () => ({ ReconciliationAdjustModal: () => null }));

import { Reconciliation } from './Reconciliation';
import { StockSummary } from './StockSummary';
import { WarehouseDetails } from './WarehouseDetails';

const PHOTO = 'https://fotos.test/garrafa-10.jpg';

const balance = (photo: string | null) => ({
  locationId: 'l-1',
  locationName: 'Galpón Central',
  locationKind: 'warehouse',
  warehouseId: 'w-1',
  carId: null,
  gasCylinderId: 'g-1',
  gasCylinderType: '10kg',
  gasCylinderPhotoUrl: photo,
  condition: 'full',
  quantity: 8,
  updatedAt: '2026-10-12T00:00:00.000Z',
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StockSummary: foto del producto', () => {
  const draw = (photo: string | null) => {
    state.summary.mockReturnValue(
      ok([
        {
          gasCylinderId: 'g-1',
          gasCylinderType: '10kg',
          gasCylinderPhotoUrl: photo,
          warehouses: { full: 8, empty: 3, defective: 1 },
          vehicles: { full: 2, empty: 1, defective: 0 },
          physicalFull: 10,
          reserved: 2,
          sellable: 8,
          minimumFull: 12,
        },
      ]),
    );
    state.balances.mockReturnValue(ok([balance(photo)]));
    state.thresholds.mockReturnValue(ok([]));
    return renderPage(<StockSummary />, { url: '/stock' });
  };

  it('muestra la miniatura del producto en el resumen y en el saldo por ubicación', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelectorAll(`img[src="${PHOTO}"]`)).toHaveLength(2);
  });

  it('sin foto sólo queda el nombre', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('10kg').length).toBeGreaterThan(0);
  });
});

describe('WarehouseDetails: foto del producto', () => {
  const draw = (photo: string | null) => {
    state.warehouse.mockReturnValue(
      ok({
        warehouseId: 'w-1',
        locationId: 'l-1',
        name: 'Galpón Central',
        code: 'GC-01',
        kind: 'depot',
        address: 'Ruta 12',
        isDefault: true,
        isActive: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        balances: [balance(photo)],
      }),
    );
    state.count.mockReturnValue(ok({ adjustmentId: 'a-9', number: 9, createdAt: '2026-10-02T10:00:00.000Z' }));
    return renderPage(<WarehouseDetails />, { url: '/stock/warehouses/w-1', path: '/stock/warehouses/:id' });
  };

  it('muestra la miniatura del producto en el saldo', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto sólo queda el nombre', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('10kg')).toBeInTheDocument();
  });
});

describe('Reconciliation: foto del producto', () => {
  const draw = (photo: string | null) => {
    state.report.mockReturnValue(
      ok({
        checkedAt: '2026-10-12T03:00:00.000Z',
        consistent: false,
        cylinders: [
          {
            gasCylinderId: 'g-1',
            gasCylinderType: '10kg',
            gasCylinderPhotoUrl: photo,
            sellable: 8,
            physicalFull: 10,
            reserved: 1,
            expected: 9,
            difference: -1,
          },
        ],
        deliveriesWithoutMovement: [],
      }),
    );
    state.reapply.mockReturnValue(mutation());
    return renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
  };

  it('muestra la miniatura del producto', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto no dibuja imagen', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
  });
});
