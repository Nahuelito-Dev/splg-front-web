import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cylinder } from '../../../services/api/types';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Cylinder[]; columns: GridColDef<Cylinder>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.cylinder_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<Cylinder>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { PhysicalCylindersTable } from './PhysicalCylindersTable';

afterEach(cleanup);

const cylinder = (serial: string, state: Cylinder['state']) =>
  ({
    cylinder_id: serial,
    serial,
    state,
    deposit: 0,
    gas_cylinder: null,
    current_customer: null,
  }) as unknown as Cylinder;

const renderTable = (rows: Cylinder[], onRetire = vi.fn(), onEdit = vi.fn()) =>
  render(
    <PhysicalCylindersTable
      rows={rows}
      total={rows.length}
      loading={false}
      pagination={{ page: 0, pageSize: 10 }}
      onPaginationChange={vi.fn()}
      onView={vi.fn()}
      onEdit={onEdit}
      onRetire={onRetire}
    />,
  );

describe('PhysicalCylindersTable: editar y dar de baja', () => {
  it('la baja sólo se ofrece desde el depósito o vacío devuelto (los demás estados dan 400 en la API)', () => {
    const onRetire = vi.fn();
    renderTable(
      [
        cylinder('A', 'in_depot'),
        cylinder('B', 'empty_returned'),
        cylinder('C', 'filled'),
        cylinder('D', 'with_customer'),
      ],
      onRetire,
    );
    expect(screen.getAllByRole('button', { name: /^Dar de baja envase/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja envase A' }));
    expect(onRetire).toHaveBeenCalledTimes(1);
  });

  it('un envase retirado sólo se ve: no se edita ni se vuelve a dar de baja', () => {
    renderTable([cylinder('R', 'retired')]);
    expect(screen.getByRole('button', { name: 'Ver envase R' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar envase/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Dar de baja envase/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull();
  });
});
