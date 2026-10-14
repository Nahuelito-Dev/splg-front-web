import { cleanup, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../../services/api/types';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Delivery[]; columns: GridColDef<Delivery>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.delivery_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<Delivery>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { DeliveriesTable } from './DeliveriesTable';

afterEach(cleanup);

const row = {
  delivery_id: 'd-1',
  user: { full_name: 'Luis Gómez' },
  validated: false,
  calification: null,
} as unknown as Delivery;

const renderTable = (handlers: Partial<Parameters<typeof DeliveriesTable>[0]>) =>
  render(
    <MemoryRouter>
      <DeliveriesTable
        rows={[row]}
        total={1}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        {...handlers}
      />
    </MemoryRouter>,
  );

describe('DeliveriesTable: acciones de la fila', () => {
  it('con los manejadores ofrece editar, dar de baja y validar', () => {
    renderTable({ onEdit: vi.fn(), onDelete: vi.fn(), onToggleValidated: vi.fn() });
    expect(screen.getByRole('button', { name: /^Editar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Dar de baja/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Más acciones/ })).toBeInTheDocument();
  });

  it('sin manejadores (sin distribuidora elegida) sólo se puede ver al chofer', () => {
    renderTable({});
    expect(screen.getByRole('button', { name: /^Ver/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Dar de baja/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Más acciones/ })).toBeNull();
  });
});
