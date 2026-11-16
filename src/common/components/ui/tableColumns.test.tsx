import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RowActions } from './RowActions';
import {
  ACTIONS_COLUMN_WIDTH,
  DATE_COLUMN_WIDTH,
  MAIN_COLUMN_MIN_WIDTH,
  columnKinds,
  layoutColumns,
  renderColumnValue,
  type TableColumn,
} from './tableColumns';
import type { GridRenderCellParams } from '@mui/x-data-grid';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  stock: number;
}

const byField = (columns: ReturnType<typeof layoutColumns<Row>>, field: string) =>
  columns.find((column) => column.field === field);

describe('layoutColumns: reparto del ancho', () => {
  it('la primera columna es la principal: mínimo 240 px y el mayor peso, aunque viniera con ancho fijo', () => {
    const laid = layoutColumns<Row>([
      { field: 'name', headerName: 'Garrafa', width: 140 },
      { field: 'receivedAt', headerName: 'Recibida', flex: 3, minWidth: 180 },
    ]);
    expect(byField(laid, 'name')).toMatchObject({ width: undefined, flex: 2, minWidth: MAIN_COLUMN_MIN_WIDTH });
    // Ninguna otra se queda con todo el sobrante: su peso queda por debajo del de la principal.
    expect(byField(laid, 'receivedAt')).toMatchObject({ flex: 1 });
  });

  it('una principal que ya pesaba más conserva su peso y su mínimo mayor', () => {
    const laid = layoutColumns<Row>([{ field: 'name', flex: 3, minWidth: 300 }]);
    expect(byField(laid, 'name')).toMatchObject({ flex: 3, minWidth: 300 });
  });

  it('las cifras van con ancho fijo entre 96 y 120 px, a la derecha', () => {
    const laid = layoutColumns<Row>([
      { field: 'name' },
      { field: 'stock', type: 'number', width: 190 },
      { field: 'reserved', type: 'number', width: 60 },
      { field: 'sold', type: 'number', flex: 1 },
    ]);
    expect(byField(laid, 'stock')).toMatchObject({ width: 120, flex: undefined, align: 'right', headerAlign: 'right' });
    expect(byField(laid, 'reserved')).toMatchObject({ width: 96 });
    expect(byField(laid, 'sold')).toMatchObject({ width: 112, flex: undefined });
  });

  it('la plata y las fechas marcadas tienen su ancho fijo', () => {
    const laid = layoutColumns<Row>([
      { field: 'occurredAt', kind: 'date', flex: 1 },
      { field: 'name' },
      { field: 'total', kind: 'money' },
    ]);
    expect(byField(laid, 'occurredAt')).toMatchObject({ width: DATE_COLUMN_WIDTH, flex: undefined });
    expect(byField(laid, 'total')).toMatchObject({ width: 140, align: 'right' });
    // La fecha de adelante no es la principal: lo es la primera que no es otra cosa.
    expect(byField(laid, 'name')).toMatchObject({ flex: 2, minWidth: MAIN_COLUMN_MIN_WIDTH });
  });

  it('la columna de acciones es fija, a la derecha y nunca más angosta que tres botones', () => {
    const laid = layoutColumns<Row>([{ field: 'name' }, { field: 'actions', width: 72 }, { field: 'other', flex: 1 }]);
    expect(byField(laid, 'actions')).toMatchObject({
      width: ACTIONS_COLUMN_WIDTH,
      flex: undefined,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
    });
    const wide = layoutColumns<Row>([{ field: 'name' }, { field: 'actions', flex: 1, minWidth: 200 }]);
    expect(byField(wide, 'actions')).toMatchObject({ width: 200, flex: undefined });
  });

  it('las marcas propias (`kind`, `card`) no llegan al DataGrid', () => {
    const [column] = layoutColumns<Row>([{ field: 'name', kind: 'main', card: false }]);
    expect(column).not.toHaveProperty('kind');
    expect(column).not.toHaveProperty('card');
  });

  it('columnKinds deduce estado y acciones, y marca principal sólo a una', () => {
    const columns: TableColumn<Row>[] = [
      { field: 'name' },
      { field: 'phone' },
      { field: 'isActive', headerName: 'Estado' },
      { field: 'actions' },
    ];
    expect(columnKinds(columns)).toEqual(['main', undefined, 'status', 'actions']);
  });
});

describe('layoutColumns: celdas dibujadas a mano', () => {
  it('se recortan con «…»; el tooltip sale sólo del texto que declara la columna, nunca del valor crudo', () => {
    const [plain, declared] = layoutColumns<Row>([
      {
        field: 'name',
        renderCell: ({ row }) => (
          <div>
            <span className="block">{row.name}</span>
          </div>
        ),
      },
      {
        field: 'status',
        renderCell: () => <span>En revisión</span>,
        tooltip: () => 'En revisión desde el lunes',
      },
    ]);
    const row = { id: '1', name: 'Curso de transporte de mercancías peligrosas', stock: 0 };
    const draw = (column: typeof plain, value: unknown) => {
      const { container } = render(
        <>{column.renderCell?.({ row, value, formattedValue: value } as GridRenderCellParams<Row>)}</>,
      );
      return container.firstElementChild as HTMLElement;
    };
    const cell = draw(plain, row.name);
    expect(cell).toHaveClass('truncate', 'max-w-full', 'min-w-0');
    expect(cell).not.toHaveAttribute('title');
    cleanup();
    const status = draw(declared, 'in_review');
    expect(status).toHaveAttribute('title', 'En revisión desde el lunes');
    expect(status.getAttribute('title')).not.toContain('in_review');
  });

  it('`tooltip` tampoco llega al DataGrid', () => {
    const [column] = layoutColumns<Row>([{ field: 'name', tooltip: () => 'x' }]);
    expect(column).not.toHaveProperty('tooltip');
  });

  it('la de acciones dibuja los botones con lugar fijo (Ver, Editar, ⋯)', () => {
    const [, column] = layoutColumns<Row>([
      { field: 'name' },
      { field: 'actions', renderCell: () => <RowActions rowLabel="Ana" onView={vi.fn()} /> },
    ]);
    const { container } = render(<>{column.renderCell?.({} as GridRenderCellParams<Row>)}</>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(3);
  });
});

describe('renderColumnValue', () => {
  const row = { id: '1', name: 'Ana', stock: 0 };

  it('usa valueGetter, valueFormatter y renderCell como la grilla', () => {
    expect(renderColumnValue<Row>({ field: 'name' }, row, '1')).toBe('Ana');
    expect(renderColumnValue<Row>({ field: 'stock', valueGetter: ({ row: r }) => r.stock + 5 }, row, '1')).toBe('5');
    expect(
      renderColumnValue<Row>({ field: 'stock', valueFormatter: ({ value }) => `${String(value)} u.` }, row, '1'),
    ).toBe('0 u.');
    render(
      <>{renderColumnValue<Row>({ field: 'name', renderCell: ({ value }) => <b>{String(value)}</b> }, row, '1')}</>,
    );
    expect(screen.getByText('Ana').tagName).toBe('B');
  });

  it('sin valor, un guion', () => {
    expect(renderColumnValue<Row>({ field: 'missing' }, row, '1')).toBe('—');
  });
});
