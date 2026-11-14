import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ warehouse: vi.fn(), count: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/stock', () => ({
  useWarehouse: () => state.warehouse() as unknown,
  useInitialCount: () => state.count() as unknown,
  useUpdateWarehouse: () => mutation(),
}));
vi.mock('./components/WarehouseFormModal', () => ({ WarehouseFormModal: () => null }));
vi.mock('./components/InitialCountModal', () => ({
  InitialCountModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de conteo inicial</p> : null),
}));

import { WarehouseDetails } from './WarehouseDetails';

const GALPON = {
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
  balances: [],
};
const COUNT = { adjustmentId: 'a-9', number: 9, createdAt: '2026-10-02T10:00:00.000Z' };

const draw = () => renderPage(<WarehouseDetails />, { url: '/stock/warehouses/w-1', path: '/stock/warehouses/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

describe('WarehouseDetails', () => {
  it('muestra la ubicación del galpón o que está sin ubicar', () => {
    state.warehouse.mockReturnValue(ok({ ...GALPON, latitude: -27.3671, longitude: -55.8961 }));
    state.count.mockReturnValue(ok(COUNT));
    draw();
    expect(screen.getByText('-27.367100, -55.896100')).toBeInTheDocument();
    cleanup();
    state.warehouse.mockReturnValue(ok({ ...GALPON, latitude: null, longitude: null }));
    draw();
    expect(screen.getByText(/^Sin ubicar/)).toBeInTheDocument();
  });

  it('con el conteo inicial hecho lo enlaza y no ofrece hacerlo de nuevo', () => {
    state.warehouse.mockReturnValue(ok(GALPON));
    state.count.mockReturnValue(ok(COUNT));
    draw();
    expect(screen.getByRole('link', { name: /N° 9/ })).toHaveAttribute('href', '/stock/adjustments/a-9');
    expect(screen.queryByRole('button', { name: 'Conteo inicial' })).not.toBeInTheDocument();
  });

  it('sin conteo inicial lo ofrece y abre el formulario', () => {
    state.warehouse.mockReturnValue(ok(GALPON));
    state.count.mockReturnValue(ok(null));
    draw();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Conteo inicial' }));
    expect(screen.getByText('Formulario de conteo inicial')).toBeInTheDocument();
  });

  it('mientras se consulta el conteo no ofrece hacerlo (podría ya existir) ni dice «Pendiente»', () => {
    state.warehouse.mockReturnValue(ok(GALPON));
    state.count.mockReturnValue({ ...loading(), data: undefined });
    draw();
    expect(screen.queryByRole('button', { name: 'Conteo inicial' })).not.toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('si la consulta del conteo falla no afirma nada y no ofrece hacerlo', () => {
    state.warehouse.mockReturnValue(ok(GALPON));
    const refetch = vi.fn();
    state.count.mockReturnValue(failed(refetch));
    draw();
    expect(screen.getByText(/No se pudo consultar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conteo inicial' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error del galpón se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.warehouse.mockReturnValue(failed(refetch));
    state.count.mockReturnValue(ok(null));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin permiso de escritura no se puede editar ni hacer el conteo', () => {
    state.canWrite = false;
    state.warehouse.mockReturnValue(ok(GALPON));
    state.count.mockReturnValue(ok(null));
    draw();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Conteo inicial' })).not.toBeInTheDocument();
  });
});
