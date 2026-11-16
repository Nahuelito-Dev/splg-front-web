import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
    const offersRetire = (serial: string) => {
      const more = screen.queryByRole('button', { name: `Más acciones de envase ${serial}` });
      if (!more) return false;
      fireEvent.click(more);
      const menus = screen.getAllByRole('menu');
      const offered = within(menus[menus.length - 1]).queryByRole('menuitem', { name: 'Dar de baja' }) !== null;
      fireEvent.keyDown(menus[menus.length - 1], { key: 'Escape' });
      return offered;
    };
    expect(['C', 'D', 'B', 'A'].map(offersRetire)).toEqual([false, false, true, true]);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de envase A' }));
    const menus = screen.getAllByRole('menu');
    fireEvent.click(within(menus[menus.length - 1]).getByRole('menuitem', { name: 'Dar de baja' }));
    expect(onRetire).toHaveBeenCalledTimes(1);
  });

  it('un envase retirado sólo se ve: no se edita ni se vuelve a dar de baja', () => {
    renderTable([cylinder('R', 'retired')]);
    expect(screen.getByRole('button', { name: 'Ver envase R' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar envase/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull();
  });
});
