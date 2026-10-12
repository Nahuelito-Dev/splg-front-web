import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../services/api/types';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Order[]; columns: GridColDef<Order>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.order_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<Order>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { OrdersTable } from './OrdersTable';

afterEach(cleanup);

const order = (id: string, over: Partial<Order>) =>
  ({
    order_id: `${id}-000000`,
    status: 'pending',
    payment_method: 'cash',
    delivery_id: null,
    ...over,
  }) as unknown as Order;

const renderTable = (rows: Order[], onEdit = vi.fn(), onCancel = vi.fn()) =>
  render(
    <OrdersTable
      rows={rows}
      total={rows.length}
      loading={false}
      pagination={{ page: 0, pageSize: 10 }}
      onPaginationChange={vi.fn()}
      onView={vi.fn()}
      onAssign={vi.fn()}
      onEdit={onEdit}
      onCancel={onCancel}
    />,
  );

describe('OrdersTable: editar y cancelar', () => {
  it('un pedido pendiente sin chofer ni pago online se edita y se cancela', () => {
    const onEdit = vi.fn();
    const onCancel = vi.fn();
    renderTable([order('aaaaaa', {})], onEdit, onCancel);
    fireEvent.click(screen.getByRole('button', { name: /^Editar pedido/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar pedido/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('con chofer o checkout de MercadoPago la edición se ve apagada y explica el motivo, sin llamar a la API', () => {
    const onEdit = vi.fn();
    renderTable([order('bbbbbb', { delivery_id: 'd-1' }), order('cccccc', { payment_url: 'https://mp/x' })], onEdit);
    const blocked = screen.getAllByRole('button', { name: /no disponible/ });
    expect(blocked.map((b) => b.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('ya tiene chofer asignado'),
      expect.stringContaining('MercadoPago'),
    ]);
    blocked.forEach((b) => fireEvent.click(b));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('un pedido con pago «online» sin checkout se puede intentar editar (puede ser transferencia)', () => {
    renderTable([order('eeeeee', { payment_method: 'online' })]);
    expect(screen.getByRole('button', { name: /^Editar pedido/ })).not.toHaveAttribute('aria-disabled');
  });

  it('un pedido cancelado no se vuelve a cancelar', () => {
    renderTable([order('dddddd', { status: 'cancelled' })]);
    expect(screen.queryByRole('button', { name: /^Cancelar pedido/ })).toBeNull();
  });
});

describe('OrdersTable: estado de cobro', () => {
  it('cada pedido muestra su cobro con la etiqueta en castellano', () => {
    renderTable([
      order('a1', { paymentStatus: 'pending' }),
      order('a2', { paymentStatus: 'paid' }),
      order('a3', { paymentStatus: 'unpaid' }),
      order('a4', { paymentStatus: 'written_off' }),
    ]);
    for (const text of ['Pendiente', 'Cobrado', 'Impago', 'Pérdida']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });
});
