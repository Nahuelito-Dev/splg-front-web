import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), remove: vi.fn(), confirm: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../services/queries/stock', () => ({
  useWarehouses: (...args: unknown[]) => state.list(...args) as unknown,
  useUpdateWarehouse: () => state.update() as unknown,
  useDeleteWarehouse: () => state.remove() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/WarehouseFormModal', () => ({ WarehouseFormModal: () => null }));

import { Warehouses } from './Warehouses';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const GALPON = {
  warehouseId: 'w-1',
  name: 'Galpón Central',
  code: 'GC-01',
  kind: 'depot',
  address: 'Ruta 12 km 3',
  isActive: true,
  isDefault: false,
  locationId: 'l-1',
};

describe('Warehouses', () => {
  it('lista los galpones con su código y dirección', () => {
    state.list.mockReturnValue(ok([GALPON]));
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    expect(screen.getByRole('heading', { name: 'Galpones' })).toBeInTheDocument();
    expect(screen.getByText('Galpón Central')).toBeInTheDocument();
    expect(screen.getByText('GC-01')).toBeInTheDocument();
  });

  it('un estado por celda: «Activo» como etiqueta y «Predeterminado» como texto secundario', () => {
    state.list.mockReturnValue(ok([{ ...GALPON, isDefault: true }]));
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    expect(screen.getByText('Activo')).toHaveClass('rounded-full');
    expect(screen.getByText('Predeterminado')).not.toHaveClass('rounded-full');
    expect(screen.getByText('Predeterminado')).toHaveClass('text-muted');
  });

  it('«dados de baja» es un chip de la barra del listado', () => {
    state.list.mockReturnValue(ok([GALPON]));
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    const box = screen.getByRole('checkbox', { name: 'Mostrar galpones dados de baja' });
    expect(box.closest('label')).toHaveClass('h-10', 'rounded-[10px]');
    fireEvent.click(box);
    expect(state.list).toHaveBeenLastCalledWith(true);
  });

  it('dice qué galpón está ubicado y cuál no', () => {
    state.list.mockReturnValue(
      ok([
        { ...GALPON, latitude: -27.3671, longitude: -55.8961 },
        { ...GALPON, warehouseId: 'w-2', name: 'Galpón Sur', code: 'GS-01', latitude: null, longitude: null },
      ]),
    );
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    const card = (name: string) => within(screen.getByText(name).closest('li') as HTMLElement);
    expect(card('Galpón Central').getByText('Ubicado')).toBeInTheDocument();
    expect(card('Galpón Central').queryByText('Sin ubicar')).not.toBeInTheDocument();
    expect(card('Galpón Sur').getByText('Sin ubicar')).toBeInTheDocument();
  });

  it('sin galpones muestra el vacío y no una tabla', () => {
    state.list.mockReturnValue(ok([]));
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    expect(screen.getByText('Todavía no hay galpones')).toBeInTheDocument();
  });

  it('mientras carga muestra el estado de carga', () => {
    state.list.mockReturnValue(loading());
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    expect(screen.getByRole('status', { name: 'Cargando galpones' })).toBeInTheDocument();
  });

  it('un error del back se dice y permite reintentar, no se pasa por vacío', () => {
    const refetch = vi.fn();
    state.list.mockReturnValue(failed(refetch));
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
    renderPage(<Warehouses />);
    expect(screen.queryByText('Todavía no hay galpones')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('marcar predeterminado confirma y manda el cambio', async () => {
    const update = mutation();
    state.list.mockReturnValue(ok([GALPON]));
    state.update.mockReturnValue(update);
    state.remove.mockReturnValue(mutation());
    state.confirm.mockResolvedValue(true);
    renderPage(<Warehouses />);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar predeterminado' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toEqual({ id: 'w-1', body: { isDefault: true } });
  });

  it('si se cancela la confirmación no cambia nada', async () => {
    const update = mutation();
    state.list.mockReturnValue(ok([GALPON]));
    state.update.mockReturnValue(update);
    state.remove.mockReturnValue(mutation());
    state.confirm.mockResolvedValue(false);
    renderPage(<Warehouses />);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar predeterminado' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect(update.mutate).not.toHaveBeenCalled();
  });
});
