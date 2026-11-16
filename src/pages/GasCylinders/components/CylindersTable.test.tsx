import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import type { CatalogCylinder } from '../../../services/api/gasCylinders';

// Las columnas que recibió la tabla en el último render.
let columnFields: string[] = [];

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({
    rows,
    columns,
    empty,
  }: {
    rows: CatalogCylinder[];
    columns: GridColDef<CatalogCylinder>[];
    empty: React.ReactNode;
  }) => {
    columnFields = columns.map((column) => column.field);
    return rows.length === 0 ? (
      <div>{empty}</div>
    ) : (
      <div>
        {rows.map((row) => (
          <div key={row.gas_cylinder_id}>
            {columns.map((column) => (
              <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<CatalogCylinder>)}</div>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

import { CylindersTable } from './CylindersTable';

afterEach(cleanup);

const cylinder = {
  gas_cylinder_id: 'g1',
  type: '10kg',
  weight: 10,
  price: 1000,
  container_price: null,
  stock: 5,
  promotions: null,
} as CatalogCylinder;

const renderTable = (props: Partial<Parameters<typeof CylindersTable>[0]> = {}) =>
  render(
    <MemoryRouter>
      <CylindersTable
        rows={[cylinder]}
        total={1}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

describe('CylindersTable', () => {
  it('en el catálogo activo ofrece editar y desactivar', () => {
    renderTable({ onEdit: vi.fn(), onDelete: vi.fn(), onReactivate: vi.fn() });
    expect(screen.getByRole('button', { name: 'Editar 10kg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar 10kg' })).toBeInTheDocument();
  });

  it('en la vista de dados de baja sólo se puede ver y reactivar', () => {
    const onReactivate = vi.fn();
    renderTable({ inactive: true, onEdit: vi.fn(), onDelete: vi.fn(), onAdjustStock: vi.fn(), onReactivate });
    expect(screen.getByRole('button', { name: 'Ver 10kg' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar 10kg' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar 10kg' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de 10kg' }));
    expect(screen.queryByRole('menuitem', { name: 'Ajustar stock' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reactivar' }));
    expect(onReactivate).toHaveBeenCalledWith(cylinder);
  });

  it('sin permiso de escritura no hay reactivar', () => {
    renderTable({ inactive: true });
    expect(screen.queryByRole('button', { name: 'Más acciones de 10kg' })).not.toBeInTheDocument();
  });

  it('sin productos dados de baja lo dice', () => {
    renderTable({ rows: [], total: 0, inactive: true });
    expect(screen.getByText('No hay productos dados de baja')).toBeInTheDocument();
  });

  it('con filtros y sin resultados no se confunde con el vacío del recurso', () => {
    renderTable({ rows: [], total: 0, inactive: true, filtered: true });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('la celda de precio dice «Envase sin cargar» si no tiene precio de envase', () => {
    renderTable();
    expect(screen.getByText('Envase sin cargar')).toBeInTheDocument();
  });

  it('la celda de precio muestra el envase como segunda línea, en moneda', () => {
    renderTable({ rows: [{ ...cylinder, container_price: 25000 }] });
    expect(screen.getByText(/^\$\s1\.000$/)).toBeInTheDocument();
    expect(screen.getByText(/^Envase \$\s25\.000$/)).toBeInTheDocument();
    expect(screen.queryByText('Envase sin cargar')).not.toBeInTheDocument();
  });

  it('no suma columnas: siguen siendo 5', () => {
    renderTable();
    expect(columnFields).toEqual(['type', 'price', 'stock', 'promotions', 'actions']);
  });
});
