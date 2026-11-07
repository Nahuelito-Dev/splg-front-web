import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCylinder } from '../../services/api/gasCylinders';
import { mutation, ok } from '../../test/pageTest';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: CatalogCylinder[]; columns: GridColDef<CatalogCylinder>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.gas_cylinder_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<CatalogCylinder>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const state = vi.hoisted(() => ({
  catalog: undefined as unknown,
  inactive: undefined as unknown,
  reactivate: undefined as unknown,
  inactiveEnabled: [] as boolean[],
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined, needsDistributor: false }),
}));
vi.mock('../../services/queries/gasCylinders', () => ({
  useGasCylinders: () => state.catalog,
  useGasCylinderTypes: () => ok({ rows: [], total: 0 }),
  useAvailableGasCylinders: () => ok({ products: [], paymentMethods: [] }),
  useGasCylinderByType: () => ok(undefined, { isPending: false }),
  useDeleteGasCylinder: () => mutation(),
  useInactiveGasCylinders: (_params: unknown, _search: string, enabled: boolean) => {
    state.inactiveEnabled.push(enabled);
    return state.inactive;
  },
  useReactivateGasCylinder: () => state.reactivate,
}));
vi.mock('../../common/components/ImportWizard/ImportWizard', () => ({
  ImportWizard: ({ resource }: { resource: string }) => <div role="dialog" aria-label={`Importar ${resource}`} />,
}));
vi.mock('./components/CylinderFormModal', () => ({ CylinderFormModal: () => null }));
vi.mock('./components/StockAdjustModal', () => ({ StockAdjustModal: () => null }));
const confirmed = vi.hoisted(() => ({ value: true }));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: () => Promise.resolve(confirmed.value),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { GasCylinders } from './GasCylinders';

const cylinder = (id: string, type: string, isActive: boolean) =>
  ({
    gas_cylinder_id: id,
    type,
    weight: 10,
    price: 1000,
    container_price: null,
    stock: 5,
    promotions: null,
    isActive,
  }) as CatalogCylinder;

const setup = (url = '/cylinders') => {
  state.catalog = ok({ rows: [cylinder('g1', '10kg', true)], total: 1 });
  state.inactive = ok({ rows: [cylinder('g2', '45kg', false)], total: 1 });
  state.reactivate = mutation();
  state.inactiveEnabled = [];
  render(
    <MemoryRouter initialEntries={[url]}>
      <GasCylinders />
    </MemoryRouter>,
  );
  return state.reactivate as ReturnType<typeof mutation>;
};

afterEach(() => {
  cleanup();
  confirmed.value = true;
});

describe('GasCylinders: productos dados de baja (CU-268, CU-269)', () => {
  it('por defecto muestra el catálogo activo y no consulta los inactivos', () => {
    setup();
    expect(screen.getByText('10kg')).toBeInTheDocument();
    expect(screen.queryByText('45kg')).not.toBeInTheDocument();
    expect(state.inactiveEnabled.every((enabled) => !enabled)).toBe(true);
  });

  it('con el interruptor «Dados de baja» lista los inactivos y ofrece reactivar', async () => {
    setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar los productos dados de baja' }));
    expect(await screen.findByText('45kg')).toBeInTheDocument();
    expect(screen.queryByText('10kg')).not.toBeInTheDocument();
    expect(screen.getByText('Dados de baja', { selector: 'span.text-sm' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar 45kg' })).not.toBeInTheDocument();
    expect(state.inactiveEnabled.at(-1)).toBe(true);
  });

  it('reactivar pide confirmación y reactiva el producto elegido', async () => {
    const reactivate = setup('/cylinders?inactive=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de 45kg' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reactivar' }));
    await waitFor(() => expect(reactivate.mutate).toHaveBeenCalled());
    expect(reactivate.mutate.mock.calls[0]?.[0]).toBe('g2');
  });

  it('si no se confirma, no reactiva', async () => {
    confirmed.value = false;
    const reactivate = setup('/cylinders?inactive=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de 45kg' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reactivar' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(reactivate.mutate).not.toHaveBeenCalled();
  });
});

describe('GasCylinders: importación', () => {
  it('el menú «Más» ofrece importar garrafas y precios', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('menuitem', { name: 'Importar precios' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Importar garrafas' }));
    expect(await screen.findByRole('dialog', { name: 'Importar garrafas' })).toBeInTheDocument();
  });
});
